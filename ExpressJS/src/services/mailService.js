const nodemailer = require('nodemailer');
const { isGmailAddress } = require('../utils/gmail');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
};

/**
 * Gửi email qua Gmail SMTP. Chỉ gửi tới địa chỉ @gmail.com khi AUTH_GMAIL_ONLY.
 */
const sendMail = async ({ to, subject, html, text }) => {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[mail] Chưa cấu hình GMAIL_USER / GMAIL_APP_PASSWORD — bỏ qua gửi email');
    return { skipped: true };
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
    text: text || subject,
    html: html || `<p>${text || subject}</p>`,
  });

  return { messageId: info.messageId, skipped: false };
};

const notifyUserByEmail = async (user, { title, message }) => {
  if (!user?.email) return { skipped: true };
  return sendMail({
    to: user.email,
    subject: `[School MS] ${title}`,
    html: `<div style="font-family:sans-serif"><h3>${title}</h3><p>${message}</p></div>`,
    text: `${title}\n\n${message}`,
  });
};

module.exports = { sendMail, notifyUserByEmail, getTransporter };
