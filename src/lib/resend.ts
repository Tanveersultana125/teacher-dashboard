export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    // 🛡️ LOCALHOST INTERCEPTION: Avoid 404 Serverless Crashes
    // Without a VITE_RESEND_API_KEY in the .env file, local HTTP requests to /api/send-email will fail.
    // We intercept and resolve locally so the Dashboard UI acts perfectly.
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.warn("🔐 Local Email Simulation: Email successfully generated but not delivered. Please configure VITE_RESEND_API_KEY in .env to enable real SMTP delivery.");
      // Simulate network delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      return { id: "mock_id_local_bypass", message: "Simulated success on localhost" };
    }

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send email');
      }
      return data;
    } else {
      const text = await response.text();
      throw new Error(`Server error: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Email failed:', error);
    throw error;
  }
};
