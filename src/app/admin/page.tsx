import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAllUsers } from "@/lib/backend-client";
import { ensureBackendProfile } from "@/lib/user-profile";
import { stackServerApp } from "@/stack/server";
import { updateUserRole } from "./actions";

const ROLE_LABELS = [
  { value: "admin", label: "Admin" },
  { value: "mentor", label: "Mentor" },
  { value: "student", label: "Student" },
];

export default async function AdminPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const { profile, needsOnboarding } = await ensureBackendProfile(user, { allowGrant: false });

  if (needsOnboarding || !profile) {
    redirect("/onboarding");
  }
  if (profile.role !== "admin") {
    redirect("/");
  }

  const users = await fetchAllUsers(user);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-300">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Review all registered users and update their project role as needed.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-200">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-200">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-200">
                Role
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-200">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3 font-medium text-slate-100">{u.name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-slate-400">
                  <form action={updateUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="email" value={u.email} />
                    <select
                      name="role"
                      defaultValue={u.role.toLowerCase()}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-0"
                    >
                      {ROLE_LABELS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Update
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(u.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/" className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300">
        <span aria-hidden="true">←</span> Back to home
      </Link>
    </div>
  );
}

