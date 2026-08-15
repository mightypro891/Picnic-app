import { env } from '../config/env.js';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function layout({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f1ea;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,#1f6f54,#2f8f6b);padding:28px 32px;">
                <p style="margin:0;color:#eafff5;font-size:13px;letter-spacing:2px;text-transform:uppercase;">${env.event.name}</p>
                <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#2b2b2b;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background:#faf8f2;color:#8a8578;font-size:12px;">
                This is an automated message from the ${env.event.name} organizing committee.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function send({ to, subject, html, attachments = [] }) {
  if (!env.email.brevoApiKey) {
    console.log(`\n[emailService] (BREVO_API_KEY not configured — would send)\nTo: ${to}\nSubject: ${subject}\n`);
    return { simulated: true };
  }

  const payload = {
    sender: { name: env.email.fromName, email: env.email.fromAddress },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (attachments.length > 0) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
    }));
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': env.email.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Brevo API error (${res.status}): ${errorBody || res.statusText}`);
  }

  return res.json();
}

export async function sendRegistrationReceivedEmail({ to, fullName }) {
  const html = layout({
    title: 'Registration Received',
    bodyHtml: `
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>We've received your registration and payment evidence for <strong>${env.event.name}</strong>.</p>
      <p>Your registration status is currently <strong>Pending Verification</strong>. Once our team confirms your payment, your picnic ticket (with QR code) will be sent to this email address.</p>
      <p>No further action is needed from you right now.</p>
    `,
  });
  return send({ to, subject: `Registration Received — ${env.event.name}`, html });
}

export async function sendApprovedTicketEmail({ to, fullName, level, ticketCode, qrCodeBuffer, ticketUrl }) {
  const qrBase64 = qrCodeBuffer.toString('base64');
  const html = layout({
    title: 'Your Ticket Is Ready 🎉',
    bodyHtml: `
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>Good news — your payment has been <strong>verified</strong> and your ticket for <strong>${env.event.name}</strong> is confirmed.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border:1px solid #e7e2d6;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:16px;background:#faf8f2;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8578;">Attendee</p>
          <p style="margin:0 0 12px;font-size:16px;font-weight:600;">${escapeHtml(fullName)} · ${escapeHtml(level)} Level</p>
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8578;">Ticket ID</p>
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:1px;">${ticketCode}</p>
          <img src="data:image/png;base64,${qrBase64}" alt="Ticket QR code" width="220" height="220" style="display:block;margin:0 auto;border-radius:8px;" />
        </td></tr>
      </table>
      <p><strong>Date:</strong> ${env.event.date}<br/>
         <strong>Time:</strong> ${env.event.time}<br/>
         <strong>Venue:</strong> ${env.event.venue}</p>
      <p>Please present this QR code (screenshot is fine) at the entrance for check-in.</p>
      <p style="text-align:center;margin:24px 0 8px;">
        <a href="${ticketUrl}" style="background:#1f6f54;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block;">View My Ticket</a>
      </p>
    `,
  });

  return send({
    to,
    subject: `Your ${env.event.name} Ticket Is Ready 🎉`,
    html,
    attachments: [
      {
        filename: 'ticket-qr.png',
        content: qrCodeBuffer,
      },
    ],
  });
}

export async function sendRejectedEmail({ to, fullName, reason }) {
  const html = layout({
    title: 'Registration Update',
    bodyHtml: `
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>We were unable to verify your payment evidence for <strong>${env.event.name}</strong>, so this registration was not approved.</p>
      ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
      <p>If you believe this is a mistake, please contact the organizing committee or re-submit your registration with clearer payment evidence.</p>
    `,
  });
  return send({ to, subject: `Registration Update — ${env.event.name}`, html });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const html = layout({
    title: 'Reset Your Admin Password',
    bodyHtml: `
      <p>Hi ${escapeHtml(name || 'there')},</p>
      <p>We received a request to reset the password on your ${env.event.name} admin account.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="background:#1f6f54;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block;">Reset Password</a>
      </p>
      <p style="font-size:13px;color:#8a8578;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
    `,
  });
  return send({ to, subject: `Reset Your Admin Password — ${env.event.name}`, html });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
