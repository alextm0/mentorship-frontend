import type { CurrentServerUser } from "@stackframe/stack";

import { serverRuntimeConfig } from "@/config/server-env";

type JsonRecord = Record<string, unknown>;

export type AppUserRole = "MENTOR" | "STUDENT" | "ADMIN";

export interface InvitationResponse {
  id: string;
  mentorId: string;
  studentEmail: string;
  status: string;
  token: string;
  createdAt: string;
}

export interface MentorshipResponse {
  id: string;
  mentorId: string;
  studentId: string;
  createdAt: string;
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: AppUserRole;
  createdAt: string;
}

interface BackendFetchOptions {
  allowNotFound?: boolean;
  okStatuses?: number[];
}

async function backendFetch<T>(
  user: CurrentServerUser,
  path: string,
  init: RequestInit = {},
  options: BackendFetchOptions = {},
): Promise<T> {
  const { accessToken } = await user.currentSession.getTokens();
  if (!accessToken) {
    throw new Error("No Neon Auth access token available for the current user.");
  }

  const baseUrl = serverRuntimeConfig.backendApiUrl;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const okStatuses = new Set([...(options.okStatuses ?? []), 200, 201, 202, 204]);
  const isSuccess = response.ok || okStatuses.has(response.status);

  if (!isSuccess) {
    if (response.status === 404 && options.allowNotFound) {
      return undefined as T;
    }
    const body = await safeJson(response).catch(() => null);
    const error = body && typeof body === "object" ? JSON.stringify(body) : await response.text();
    throw new Error(
      `Backend request failed with ${response.status} ${response.statusText}: ${error}`,
    );
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  // Some endpoints (e.g., invite) may return JSON even when using okStatuses.
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

async function safeJson(response: Response): Promise<JsonRecord> {
  return (await response.json()) as JsonRecord;
}

export async function upsertBackendUser(
  user: CurrentServerUser,
  payload: { id: string; name: string; email: string; role: AppUserRole },
): Promise<void> {
  await backendFetch(
    user,
    "/api/users",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { okStatuses: [409] },
  );
}

export async function fetchMentorInvitations(
  user: CurrentServerUser,
  mentorId: string,
): Promise<InvitationResponse[]> {
  return backendFetch(
    user,
    `/api/mentorship/mentor/${encodeURIComponent(mentorId)}/invitations`,
  );
}

export async function fetchMentorConnections(
  user: CurrentServerUser,
  mentorId: string,
): Promise<MentorshipResponse[]> {
  return backendFetch(user, `/api/mentorship/mentor/${encodeURIComponent(mentorId)}/connections`);
}

export async function fetchStudentConnection(
  user: CurrentServerUser,
  studentId: string,
): Promise<MentorshipResponse | null> {
  const result = await backendFetch<MentorshipResponse | undefined>(
    user,
    `/api/mentorship/student/${encodeURIComponent(studentId)}/connection`,
    {},
    { allowNotFound: true },
  );
  return result ?? null;
}

export async function inviteStudent(
  user: CurrentServerUser,
  payload: { mentorId: string; studentEmail: string },
): Promise<InvitationResponse> {
  return backendFetch(
    user,
    "/api/mentorship/invite",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function acceptInvitation(
  user: CurrentServerUser,
  payload: { token: string; studentId: string },
): Promise<MentorshipResponse> {
  return backendFetch(
    user,
    "/api/mentorship/accept",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchAllUsers(user: CurrentServerUser): Promise<BackendUser[]> {
  return backendFetch(user, "/api/users");
}
