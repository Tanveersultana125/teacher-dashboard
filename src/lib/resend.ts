/**
 * resend.ts — client-side wrapper for /api/send-email.
 *
 * Teacher endpoint accepts structured fields only — server renders the template,
 * raw HTML is NOT accepted. Supported types: parent_notification, student_invite.
 */
import { auth } from "./firebase";

export interface ParentNotificationPayload {
  to: string;
  parentName: string;
  studentName: string;
  subject?: string;
  message: string;
  teacherName?: string;
}

export interface StudentInvitePayload {
  to: string;
  studentName: string;
  className?: string;
  teacherName?: string;
  subject?: string;
}

const postEmail = async (body: Record<string, unknown>) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any)?.error || `Failed to send email (${response.status})`);
  }
  return data;
};

export const sendParentNotificationEmail = (p: ParentNotificationPayload) =>
  postEmail({ type: "parent_notification", ...p });

export const sendStudentInviteEmail = (p: StudentInvitePayload) =>
  postEmail({ type: "student_invite", ...p });