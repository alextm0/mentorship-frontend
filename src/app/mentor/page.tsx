import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  fetchMentorConnections,
  fetchMentorInvitations,
  inviteStudent,
} from "@/lib/backend-client";
import { ensureBackendProfile } from "@/lib/user-profile";
import { stackServerApp } from "@/stack/server";

const MENTOR_PATH = "/mentor";

async function inviteStudentAction(formData: FormData) {
  "use server";

  const studentEmail = formData.get("studentEmail")?.toString().trim();
  if (!studentEmail) {
    throw new Error("Student email is required.");
  }

  const user = await stackServerApp.getUser({ or: "redirect" });
  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });
  if (needsOnboarding || !profile) {
    redirect("/onboarding");
  }
  if (profile.role !== "mentor") {
    redirect("/");
  }

  await inviteStudent(user, {
    mentorId: profile.appUserId,
    studentEmail,
  });

  revalidatePath(MENTOR_PATH);
}

export default async function MentorPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });
  if (needsOnboarding || !profile) {
    redirect("/onboarding");
  }
  if (profile.role !== "mentor") {
    redirect("/");
  }

  let backendError: string | null = null;
  let invitations: Awaited<ReturnType<typeof fetchMentorInvitations>> = [];
  let connections: Awaited<ReturnType<typeof fetchMentorConnections>> = [];

  try {
    [invitations, connections] = await Promise.all([
      fetchMentorInvitations(user, profile.appUserId),
      fetchMentorConnections(user, profile.appUserId),
    ]);
  } catch (error) {
    backendError =
      error instanceof Error ? error.message : "Failed to contact the mentorship backend service.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 text-slate-300">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Mentor Workspace</h1>
        <p className="mt-2 text-slate-400">
          You can access this area because you hold the <span className="font-medium">mentor</span> role in Neon Auth.
        </p>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-100">Invite a student</h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter a student&apos;s email to generate an invitation token they can redeem.
        </p>

        <form action={inviteStudentAction} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="email"
            name="studentEmail"
            required
            placeholder="student@example.com"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-400"
          >
            Send Invite
          </button>
        </form>
      </section>

      {backendError ? (
        <div className="rounded border border-red-600/40 bg-red-600/10 px-4 py-3 text-red-200">
          <p className="font-medium text-red-100">Backend unavailable</p>
          <p className="text-sm">{backendError}</p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-100">Pending Invitations</h2>
            {invitations.length === 0 ? (
              <p className="text-sm text-slate-500">
                There are no open invitations yet. Send a new invitation using the form above.
              </p>
            ) : (
              <ul className="space-y-2">
                {invitations.map((invite) => (
                  <li key={invite.id} className="rounded border border-slate-800 bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-100">{invite.studentEmail}</p>
                        <p className="text-xs text-slate-500">
                          Status: {invite.status.toLowerCase()} · Created{' '}
                          {new Date(invite.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <code className="rounded bg-slate-800 px-2 py-1 text-xs text-sky-300">
                        {invite.token}
                      </code>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-100">Active Connections</h2>
            {connections.length === 0 ? (
              <p className="text-sm text-slate-500">No students have accepted an invitation yet.</p>
            ) : (
              <ul className="space-y-2">
                {connections.map((connection) => (
                  <li key={connection.id} className="rounded border border-slate-800 bg-slate-900 p-4 shadow-sm">
                    <p className="font-medium text-slate-100">Mentorship #{connection.id}</p>
                    <p className="text-xs text-slate-500">
                      Student ID: {connection.studentId} · Started{' '}
                      {new Date(connection.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Link href="/" className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300">
        <span aria-hidden="true">←</span> Back to home
      </Link>
    </div>
  );
}
