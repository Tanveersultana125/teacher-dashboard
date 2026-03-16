import { Resend } from 'resend';

// Support both standard and VITE prefixed env vars
const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const resend = new Resend(apiKey);

export default async function handler(req, res) {
  // Add CORS headers for flexibility
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    console.error("CRITICAL: Resend API Key is missing in Environment Variables");
    return res.status(500).json({ error: 'Email service configuration missing (API Key)' });
  }

  const { to, subject, html } = req.body;

  try {
    const { data, error } = await resend.emails.send({
      from: 'EduIntellect <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend API Specific Error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Serverless Function Runtime Error:", err);
    res.status(500).json({ error: err.message });
  }
}
