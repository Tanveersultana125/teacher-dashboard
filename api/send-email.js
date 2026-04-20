// api/send-email.js — Vercel serverless. Hardened 2026-04-18.
//
// Teacher-side email sender (parent notifications). Server-side templates only.
import { applyCors, requireAuth, requireRole, escapeHtml, boundString, isValidEmail, rateLimit } from "./_auth.js";

const MAX_MSG  = 2000;
const MAX_NAME = 120;
const MAX_SUBJECT = 200;

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const decoded = await requireAuth(req, res);
  if (!decoded) return;
  if (!requireRole(decoded, ["teacher", "principal", "owner"], res)) return;

  if (!rateLimit(`send-email:${decoded.uid}`, 30)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email service not configured." });

  const {
    type,             // 'parent_notification' | 'student_invite'
    to,
    parentName,
    studentName,
    subject,
    message,
    teacherName,
    className,
  } = req.body || {};

  if (!isValidEmail(to)) return res.status(400).json({ error: "Invalid recipient email." });

  let html = "";
  let sSubj = "";

  if (type === "parent_notification") {
    const sParent  = boundString(parentName, MAX_NAME) || "Parent";
    const sStudent = boundString(studentName, MAX_NAME) || "your child";
    sSubj          = boundString(subject, MAX_SUBJECT) || `Update about ${sStudent}`;
    const sMessage = boundString(message, MAX_MSG);
    const sTeacher = boundString(teacherName, MAX_NAME) || "Your teacher";

    if (!sMessage) return res.status(400).json({ error: "Missing message body." });

    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <div style="background:#1e3a8a;padding:20px 24px;border-radius:8px 8px 0 0;margin:-24px -24px 24px;">
          <h2 style="color:#fff;margin:0;">${escapeHtml(sSubj)}</h2>
        </div>
        <p style="color:#334155;">Dear <strong>${escapeHtml(sParent)}</strong>,</p>
        <p style="color:#334155;">This is a message from ${escapeHtml(sTeacher)} regarding <strong>${escapeHtml(sStudent)}</strong>.</p>
        <div style="background:#f8fafc;border-left:3px solid #1e3a8a;padding:16px 18px;border-radius:0 8px 8px 0;color:#334155;font-size:14px;line-height:1.6;margin:16px 0;">
          ${escapeHtml(sMessage).replace(/\n/g, "<br>")}
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Sent via Edullent School Management</p>
      </div>
    `;
  } else if (type === "student_invite") {
    const sStudent = boundString(studentName, MAX_NAME) || "Student";
    const sClass   = boundString(className, MAX_NAME);
    const sTeacher = boundString(teacherName, MAX_NAME);
    sSubj          = boundString(subject, MAX_SUBJECT) || `You've been enrolled${sClass ? ` — ${sClass}` : ""}`;

    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:#1e3a8a;padding:24px 28px;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">EDULLENT</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Student Portal Invitation</p>
        </div>
        <div style="padding:28px;background:#fff;">
          <h2 style="color:#1e293b;margin:0 0 12px;">Welcome, ${escapeHtml(sStudent)}!</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 8px;">
            You have been enrolled${sClass ? ` in <strong>${escapeHtml(sClass)}</strong>` : " at your school"}${sTeacher ? ` — Teacher: <strong>${escapeHtml(sTeacher)}</strong>` : ""}.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Log in with this email address (<strong>${escapeHtml(to)}</strong>) to access your student portal.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://parent-dashboard-ten.vercel.app/"
               style="background:#1e3a8a;color:#fff;padding:13px 30px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">
              Go to Student Portal
            </a>
          </div>
        </div>
        <div style="background:#f1f5f9;padding:14px 28px;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">Powered by Edullent Cloud Architecture</p>
        </div>
      </div>
    `;
  } else {
    return res.status(400).json({ error: "Unknown email type." });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Edullent <invite@edulent.dgion.com>",
        to,
        subject: sSubj,
        html,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) return res.status(200).json({ success: true, id: result.id });
    console.error("[teacher send-email] Resend error:", response.status, result);
    return res.status(502).json({ error: "Email provider error." });
  } catch (err) {
    console.error("[teacher send-email] Network error:", err);
    return res.status(500).json({ error: "Failed to send email." });
  }
}