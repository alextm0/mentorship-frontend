import { redirect } from "next/navigation";

import { ensureBackendProfile } from "@/lib/user-profile";
import { stackServerApp } from "@/stack/server";

const ROLE_DESTINATIONS: Record<string, string> = {
  admin: "/admin",
  mentor: "/mentor",
  student: "/student",
};

export default async function Home() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });

  if (needsOnboarding) {
    redirect("/onboarding");
  }

  const role = profile?.role ?? null;
  if (role) {
    const destination = ROLE_DESTINATIONS[role];
    if (destination) {
      redirect(destination);
    }
  }

  redirect("/onboarding");
}
