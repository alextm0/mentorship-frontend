import { createHash } from "crypto";

import type { CurrentServerUser } from "@stackframe/stack";

import { AppUserRole, upsertBackendUser } from "./backend-client";

const ROLE_PERMISSIONS: Record<AppRole, string> = {
  mentor: "role:mentor",
  student: "role:student",
  admin: "role:admin",
};

export type AppRole = "mentor" | "student" | "admin";

export interface AppUserProfile {
  appUserId: string;
  role: AppRole;
}

interface EnsureProfileOptions {
  desiredRole?: AppRole;
  allowGrant?: boolean;
}

export interface EnsureProfileResult {
  profile: AppUserProfile | null;
  needsOnboarding: boolean;
}

export async function ensureBackendProfile(
  user: CurrentServerUser,
  options: EnsureProfileOptions = {},
): Promise<EnsureProfileResult> {
  const permissions = await user.listPermissions();
  const permissionRole = inferRoleFromPermissions(permissions);
  const metadata = (user.serverMetadata ?? {}) as Partial<AppUserProfile>;

  const role =
    options.desiredRole ?? permissionRole ?? metadata.role ?? inferRoleFromMetadata(metadata);

  if (!role) {
    return { profile: null, needsOnboarding: true };
  }

  const targetPermission = ROLE_PERMISSIONS[role];
  const hasPermission = permissions.some((p) => p.id === targetPermission);

  if (!hasPermission && options.allowGrant !== false && role !== "admin") {
    await user.grantPermission(targetPermission);
  }

  const derivedId = deriveDeterministicUuid(user.id);
  const appUserId =
    metadata.appUserId && isValidUuid(metadata.appUserId) ? metadata.appUserId : derivedId;

  const normalizedMetadata: AppUserProfile = {
    appUserId,
    role,
  };

  if (
    metadata.appUserId !== normalizedMetadata.appUserId ||
    metadata.role !== normalizedMetadata.role
  ) {
    await user.setServerMetadata(normalizedMetadata);
  }

  const email = user.primaryEmail;
  if (!email) {
    throw new Error("Neon Auth user is missing an email address.");
  }

  await upsertBackendUser(user, {
    id: normalizedMetadata.appUserId,
    email,
    name: user.displayName ?? email,
    role: role.toUpperCase() as AppUserRole,
  });

  return { profile: normalizedMetadata, needsOnboarding: false };
}

function inferRoleFromPermissions(permissions: Awaited<ReturnType<CurrentServerUser["listPermissions"]>>): AppRole | null {
  if (permissions.some((p) => p.id === ROLE_PERMISSIONS.admin)) {
    return "admin";
  }
  if (permissions.some((p) => p.id === ROLE_PERMISSIONS.mentor)) {
    return "mentor";
  }
  if (permissions.some((p) => p.id === ROLE_PERMISSIONS.student)) {
    return "student";
  }
  return null;
}

function inferRoleFromMetadata(metadata: Partial<AppUserProfile>): AppRole | null {
  if (!metadata.role) {
    return null;
  }
  return metadata.role;
}

export function deriveDeterministicUuid(input: string): string {
  const hex = createHash("sha256").update(input).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}


