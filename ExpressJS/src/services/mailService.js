const nodemailer = require('nodemailer');
const { isGmailAddress } = require('../utils/gmail');

let transporter = null;
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const getTransporter = () => {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: { user, pass },
  });
  return transporter;
};

/**
 * Gửi email qua Gmail SMTP. Chỉ gửi tới địa chỉ @gmail.com khi AUTH_GMAIL_ONLY.
 */
const sendMail = async ({ to, subject, html, text, messageId }) => {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[mail] Chưa cấu hình GMAIL_USER / GMAIL_APP_PASSWORD — bỏ qua gửi email');
    return { skipped: true, reason: 'unconfigured' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const filtered =
    process.env.AUTH_GMAIL_ONLY === 'false'
      ? recipients
      : recipients.filter((e) => isGmailAddress(e));

  if (!filtered.length) {
    return { skipped: true, reason: 'no_gmail_recipients' };
  }

  const info = await tx.sendMail({
    from: `"${process.env.GMAIL_FROM_NAME || require('../utils/appName').getAppName()}" <${process.env.GMAIL_USER}>`,
    to: filtered.join(', '),
    subject,
    ...(messageId ? { messageId } : {}),
    text: text || subject,
    html: html || `<p>${escapeHtml(text || subject)}</p>`,
  });

  return { messageId: info.messageId, skipped: false };
};

const notifyUserByEmail = async (user, { title, message, messageId }) => {
  if (!user?.email) return { skipped: true };
  return sendMail({
    to: user.email,
    subject: `[School MS] ${title}`,
    html: `<div style="font-family:sans-serif"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`,
    text: `${title}\n\n${message}`,
    messageId,
  });
};

const closeTransporter = () => { transporter?.close?.(); transporter = null; };
module.exports = { sendMail, notifyUserByEmail, getTransporter, closeTransporter };
