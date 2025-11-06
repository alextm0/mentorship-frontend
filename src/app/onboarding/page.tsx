import { redirect } from "next/navigation";

import { ensureBackendProfile, type AppRole } from "@/lib/user-profile";
import { stackServerApp } from "@/stack/server";

const SELECTABLE_ROLES: AppRole[] = ["mentor", "student"];

async function selectRoleAction(formData: FormData) {
  "use server";

  const role = formData.get("role")?.toString();
  if (role !== "mentor" && role !== "student") {
    throw new Error("Please choose a valid role.");
  }

  const user = await stackServerApp.getUser({ or: "redirect" });
  const { profile } = await ensureBackendProfile(user, { desiredRole: role });
  const destination =
    profile?.role === "mentor" ? "/mentor" : profile?.role === "student" ? "/student" : "/";
  redirect(destination);
}

export default async function OnboardingPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });

  if (!needsOnboarding && profile) {
    const destination =
      profile.role === "mentor" ? "/mentor" : profile.role === "student" ? "/student" : "/";
    redirect(destination);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-8 px-4 text-center text-slate-300">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-100">Choose your role</h1>
        <p className="text-sm text-slate-400">
          Tell us how you want to participate so we can finish setting up your account.
        </p>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        {SELECTABLE_ROLES.map((role) => (
          <form
            key={role}
            action={selectRoleAction}
            className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-left shadow-sm"
          >
            <input type="hidden" name="role" value={role} />
            <h2 className="text-xl font-semibold capitalize text-slate-100">{role}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {role === "mentor"
                ? "Invite students, review submissions, and guide their progress."
                : "Accept invitations from mentors and track your assignments."}
            </p>
            <button
              type="submit"
              className="mt-4 w-full rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-400"
            >
              Continue as {role}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
