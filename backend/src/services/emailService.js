const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = process.env.SMTP_FROM || 'liblingua <noreply@liblingua.org>';

async function sendVerificationEmail(email, name, token) {
  const url = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n[EMAIL — dev mode] Verification link for ${email}:\n  ${url}\n`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your liblingua account',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <div style="background:#C41230;padding:16px 24px;border-radius:4px 4px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">liblingua</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 4px 4px">
          <p style="color:#111;font-size:16px">Hi ${name},</p>
          <p style="color:#374151">Thanks for joining! Please verify your email address to activate your account.</p>
          <a href="${url}"
             style="display:inline-block;background:#C41230;color:#fff;font-weight:700;
                    padding:12px 28px;border-radius:4px;text-decoration:none;margin:16px 0">
            Verify Email Address
          </a>
          <p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px">
            Or copy this link into your browser:<br>
            <a href="${url}" style="color:#C41230">${url}</a>
          </p>
        </div>
      </div>`,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const url = `${process.env.FRONTEND_URL}/auth/reset-password/${token}`;
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n[EMAIL — dev mode] Password reset link for ${email}:\n  ${url}\n`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your liblingua password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <div style="background:#C41230;padding:16px 24px;border-radius:4px 4px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">liblingua</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 4px 4px">
          <p style="color:#111;font-size:16px">Hi ${name},</p>
          <p style="color:#374151">We received a request to reset your password.</p>
          <a href="${url}"
             style="display:inline-block;background:#C41230;color:#fff;font-weight:700;
                    padding:12px 28px;border-radius:4px;text-decoration:none;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
        </div>
      </div>`,
  });
}

async function sendEmailChangeVerification(newEmail, name, token) {
  const url = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`\n[EMAIL — dev mode] Email change verification for ${newEmail}:\n  ${url}\n`);
    return;
  }
  await transporter.sendMail({
    from: FROM,
    to: newEmail,
    subject: 'Confirm your new email address',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <div style="background:#C41230;padding:16px 24px;border-radius:4px 4px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">liblingua</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 4px 4px">
          <p style="color:#111;font-size:16px">Hi ${name},</p>
          <p style="color:#374151">Click below to confirm your new email address.</p>
          <a href="${url}" style="display:inline-block;background:#C41230;color:#fff;font-weight:700;padding:12px 28px;border-radius:4px;text-decoration:none;margin:16px 0">Confirm New Email</a>
          <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.</p>
        </div>
      </div>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeVerification };
