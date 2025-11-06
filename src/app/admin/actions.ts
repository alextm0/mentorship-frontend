"use server";

import { revalidatePath } from "next/cache";

import { upsertBackendUser, type AppUserRole } from "@/lib/backend-client";
import { deriveDeterministicUuid, ensureBackendProfile } from "@/lib/user-profile";
import { stackServerApp } from "@/stack/server";

const APP_ROLE_VALUE: Record<string, AppUserRole> = {
  admin: "ADMIN",
  mentor: "MENTOR",
  student: "STUDENT",
};

const PERMISSION_IDS: Record<AppUserRole, `role:${string}`> = {
  ADMIN: "role:admin",
  MENTOR: "role:mentor",
  STUDENT: "role:student",
};

export async function updateUserRole(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const roleValue = formData.get("role")?.toString().toLowerCase();

  if (!email || !roleValue || !(roleValue in APP_ROLE_VALUE)) {
    throw new Error("Invalid email or role provided.");
  }

  const actingUser = await stackServerApp.getUser({ or: "redirect" });
  const { profile, needsOnboarding } = await ensureBackendProfile(actingUser, {
    allowGrant: false,
  });

  if (needsOnboarding || !profile || profile.role !== "admin") {
    throw new Error("Only admins may update user roles.");
  }

  const target = await findStackUserByEmail(email);
  if (!target) {
    throw new Error(`No Stack user found for ${email}.`);
  }

  const desiredRole = APP_ROLE_VALUE[roleValue];
  const desiredPermission = PERMISSION_IDS[desiredRole];

  const permissions = await target.listPermissions();

  if (!permissions.some((p) => p.id === desiredPermission)) {
    await target.grantPermission(desiredPermission);
  }

  for (const permission of Object.values(PERMISSION_IDS)) {
    if (permission !== desiredPermission && permissions.some((p) => p.id === permission)) {
      await target.revokePermission(permission);
    }
  }

  const metadata = { ...(target.serverMetadata ?? {}) } as { role?: string; appUserId?: string };
  metadata.role = roleValue;
  if (!metadata.appUserId) {
    metadata.appUserId = deriveDeterministicUuid(target.id);
  }
  await target.setServerMetadata(metadata);

  await upsertBackendUser(actingUser, {
    id: metadata.appUserId,
    email: target.primaryEmail ?? email,
    name: target.displayName ?? target.primaryEmail ?? email,
    role: desiredRole,
  });

  await revalidatePath("/admin");
}

async function findStackUserByEmail(email: string) {
  let cursor: string | undefined;
  const lower = email.toLowerCase();

  while (true) {
    const batch = await stackServerApp.listUsers({ cursor, limit: 100, orderBy: "signedUpAt" });
    const match = batch.find((user) => user.primaryEmail?.toLowerCase() === lower);
    if (match) {
      return stackServerApp.getUser(match.id);
    }
    if (!batch.nextCursor) {
      break;
    }
    cursor = batch.nextCursor;
  }

  return null;
}
