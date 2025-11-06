import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptInvitation, fetchStudentConnection } from "@/lib/backend-client";
import { ensureBackendProfile } from "@/lib/user-profile";
import { stackServerApp } from "@/stack/server";

const STUDENT_PATH = "/student";

async function acceptInvitationAction(formData: FormData) {
  "use server";

  const token = formData.get("invitationToken")?.toString().trim();
  if (!token) {
    throw new Error("Invitation token is required.");
  }

  const user = await stackServerApp.getUser({ or: "redirect" });
  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });
  if (needsOnboarding || !profile) {
    redirect("/onboarding");
  }
  if (profile.role !== "student") {
    redirect("/");
  }

  await acceptInvitation(user, {
    token,
    studentId: profile.appUserId,
  });

  redirect(STUDENT_PATH);
}

export default async function StudentPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });
  if (needsOnboarding || !profile) {
    redirect("/onboarding");
  }
  if (profile.role !== "student") {
    redirect("/");
  }

  let connection = null;
  let backendError: string | null = null;

  try {
    connection = await fetchStudentConnection(user, profile.appUserId);
  } catch (error) {
    backendError =
      error instanceof Error ? error.message : "Failed to contact the mentorship backend service.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 text-slate-300">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Student Workspace</h1>
        <p className="mt-2 text-slate-400">
          Access is granted because you have the <span className="font-medium">student</span> role in Neon Auth.
        </p>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-100">Redeem invitation token</h2>
        <p className="mt-1 text-sm text-slate-400">
          Paste the token you received from your mentor to establish a connection.
        </p>

        <form action={acceptInvitationAction} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            name="invitationToken"
            required
            placeholder="invitation-token"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-400"
          >
            Accept Invitation
          </button>
        </form>
      </section>

      {backendError ? (
        <div className="rounded border border-red-600/40 bg-red-600/10 px-4 py-3 text-red-200">
          <p className="font-medium text-red-100">Backend unavailable</p>
          <p className="text-sm">{backendError}</p>
        </div>
      ) : connection ? (
        <div className="rounded border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-100">Your mentor</h2>
          <p className="text-sm text-slate-500">
            Mentor ID: {connection.mentorId} · Connected on{' '}
            {new Date(connection.createdAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No mentorship connection yet. Submit a valid token above to link with your mentor.
        </p>
      )}

      <Link href="/" className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300">
        <span aria-hidden="true">←</span> Back to home
      </Link>
    </div>
  );
}
