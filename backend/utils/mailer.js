// utils/mailer.js
import nodemailer from "nodemailer";

let _transporter = null;

function getTransporter() {
  // Read env at call time, not import time
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[mailer] SMTP not configured (SMTP_USER/SMTP_PASS missing). Email sending skipped.");
    return null;
  }
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(port) === "465", // true for 465, false for 587
    auth: { user, pass },
  });
  return _transporter;
}

export async function sendVerificationMail(to, token) {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  const from = process.env.EMAIL_FROM || `Nexora <${process.env.SMTP_USER || "no-reply@nexora.local"}>`;
  const verifyUrl = `${CLIENT_URL}/verify?token=${encodeURIComponent(token)}`;

  const transporter = getTransporter();
  if (!transporter) return;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:16px">
      <h2>Nexora – Verify your email</h2>
      <p>Click the button below to verify your email address.</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Verify Email</a>
      </p>
      <p>If the button doesn't work, copy & paste this link:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#666;font-size:12px">This link expires in 24 hours.</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject: "Verify your Nexora account", html });
}

export async function sendNewAppMail(to, app) {
  const from = process.env.EMAIL_FROM || `Nexora <${process.env.SMTP_USER || "no-reply@nexora.local"}>`;
  const transporter = getTransporter();
  if (!transporter) return;

  const html = `
    <div style="font-family:Arial,sans-serif;padding:16px">
      <h2>New app on Nexora: ${app.name}</h2>
      <p>${app.description || ""}</p>
      ${app.image ? `<img src="${app.image}" alt="${app.name}" style="max-width:100%;border-radius:8px;margin:12px 0" />` : ""}
      ${app.url ? `<p><a href="${app.url}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open App</a></p>` : ""}
      <p style="color:#666;font-size:12px">You received this because you're a Nexora user.</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject: `New app added: ${app.name}`, html });
}
