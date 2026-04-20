import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 5173,
      hmr: { overlay: false },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: 'local-email-middleware',
        configureServer: (server: any) => {
          // HTML-escape to mirror prod api/_auth.js
          const escapeHtml = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c) => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any
          )[c]);
          const bound = (v: any, max: number, fallback = "") =>
            (typeof v === "string" ? v.slice(0, max) : fallback);
          const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          const renderTemplate = (body: any): { subject: string; html: string } | { error: string } => {
            const { type, to, subject, parentName, studentName, message, teacherName, className } = body || {};

            if (type === "parent_notification") {
              const sParent  = bound(parentName, 120) || "Parent";
              const sStudent = bound(studentName, 120) || "your child";
              const sSubj    = bound(subject, 200) || `Update about ${sStudent}`;
              const sMessage = bound(message, 2000);
              const sTeacher = bound(teacherName, 120) || "Your teacher";
              if (!sMessage) return { error: "Missing message body." };
              const html = `
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
              return { subject: sSubj, html };
            }

            if (type === "student_invite") {
              const sStudent = bound(studentName, 120) || "Student";
              const sClass   = bound(className, 120);
              const sTeacher = bound(teacherName, 120);
              const sSubj    = bound(subject, 200) || `You've been enrolled${sClass ? ` — ${sClass}` : ""}`;
              const html = `
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
              return { subject: sSubj, html };
            }

            return { error: "Unknown email type." };
          };

          server.middlewares.use(async (req: any, res: any, next: any) => {
            if (req.url?.startsWith("/api/send-email") && req.method === "POST") {
              try {
                let body = "";
                req.on("data", (chunk: any) => { body += chunk.toString(); });
                req.on("end", async () => {
                  const parsed = JSON.parse(body || "{}");
                  const { to } = parsed;
                  const apiKey = env.VITE_RESEND_API_KEY;

                  if (!apiKey) {
                    console.error("[EMAIL_SERVER] VITE_RESEND_API_KEY missing in .env");
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: "VITE_RESEND_API_KEY is missing in .env" }));
                    return;
                  }

                  if (!EMAIL_RE.test(String(to || ""))) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: "Invalid recipient email." }));
                    return;
                  }

                  // Legacy path: raw { to, subject, html } still accepted for callers
                  // that haven't migrated to typed templates.
                  let subject: string;
                  let html: string;
                  if (parsed.type) {
                    const rendered = renderTemplate(parsed);
                    if ("error" in rendered) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ error: rendered.error }));
                      return;
                    }
                    subject = rendered.subject;
                    html = rendered.html;
                  } else if (parsed.subject && parsed.html) {
                    subject = parsed.subject;
                    html = parsed.html;
                  } else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: "Missing type or subject/html." }));
                    return;
                  }

                  console.log(`[EMAIL_SERVER] Sending '${parsed.type || "raw"}' to ${to}...`);

                  const response = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      from: "Edullent <invite@edulent.dgion.com>",
                      to: Array.isArray(to) ? to : [to],
                      subject,
                      html,
                    }),
                  });

                  const result: any = await response.json().catch(() => ({}));
                  console.log("[RESEND_API_STATUS]", response.status);
                  console.log("[RESEND_RESPONSE_BODY]", JSON.stringify(result, null, 2));

                  res.setHeader("Content-Type", "application/json");
                  res.statusCode = response.status || 200;
                  res.end(JSON.stringify(response.ok ? { success: true, id: result.id } : { error: result?.message || "Email provider error." }));
                });
              } catch (err: any) {
                console.error("[EMAIL_SERVER] Fatal Error:", err.message);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
