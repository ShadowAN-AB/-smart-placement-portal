const nodemailer = require('nodemailer');

let cachedTransporter = null;

const buildTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST) {
    // Dev fallback: log to stdout instead of sending.
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
};

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = buildTransporter();
  }
  return cachedTransporter;
};

/**
 * Send an email. Fire-and-forget from callers — do not await if the API
 * response should not block on delivery. Errors are logged, never thrown
 * to callers wrapped in the standard try/catch pattern.
 */
const sendMail = async ({ to, subject, html, text, attachments }) => {
  if (!to) return { skipped: true, reason: 'no recipient' };

  const from = process.env.EMAIL_FROM || 'Smart Placement Portal <no-reply@spp.local>';

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      attachments,
    });

    if (!process.env.SMTP_HOST) {
      console.log(`[mail:dev] to=${to} subject="${subject}"`);
      if (info?.message) {
        console.log(info.message.toString().substring(0, 500));
      }
    }

    return { sent: true, messageId: info?.messageId };
  } catch (error) {
    console.error(`[mail] send failed to=${to} subject="${subject}":`, error.message);
    return { sent: false, error: error.message };
  }
};

module.exports = { sendMail };
