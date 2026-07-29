const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const emailTemplates = {
  otp: (name, otp) => ({
    subject: '🔐 Your Expense Tracker Verification Code',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;background:#1a1a2e;border-radius:16px;padding:40px;color:#e2e8f0;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:24px;background:linear-gradient(135deg,#6c63ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">💰 ExpenseTracker</h1>
        </div>
        <h2 style="color:#e2e8f0;margin-bottom:8px;">Hi ${name}! 👋</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Use the code below to verify your email address. It expires in <strong style="color:#6c63ff;">10 minutes</strong>.</p>
        <div style="background:#0f0f1a;border:1px solid #6c63ff33;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:42px;font-weight:700;letter-spacing:12px;color:#6c63ff;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  }),

  passwordReset: (name, resetUrl) => ({
    subject: '🔑 Reset Your Expense Tracker Password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;background:#1a1a2e;border-radius:16px;padding:40px;color:#e2e8f0;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:24px;background:linear-gradient(135deg,#6c63ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">💰 ExpenseTracker</h1>
        </div>
        <h2 style="color:#e2e8f0;margin-bottom:8px;">Password Reset Request</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Hi ${name}, click the button below to reset your password. This link expires in <strong style="color:#6c63ff;">1 hour</strong>.</p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#00d4ff);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Reset Password</a>
        </div>
        <p style="color:#64748b;font-size:12px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p style="color:#64748b;font-size:12px;margin-top:8px;">Or copy this link: <span style="color:#6c63ff;">${resetUrl}</span></p>
      </div>`,
  }),

  budgetAlert: (name, category, used, limit, percent) => ({
    subject: `⚠️ Budget Alert: ${category} at ${percent}%`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;background:#1a1a2e;border-radius:16px;padding:40px;color:#e2e8f0;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:24px;background:linear-gradient(135deg,#6c63ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">💰 ExpenseTracker</h1>
        </div>
        <h2 style="color:#ffb74d;margin-bottom:8px;">⚠️ Budget Alert</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Hi ${name}, you've used <strong style="color:#ffb74d;">${percent}%</strong> of your <strong>${category}</strong> budget this month.</p>
        <div style="background:#0f0f1a;border:1px solid #ffb74d33;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0;color:#94a3b8;">Spent: <strong style="color:#ff5252;">$${used.toFixed(2)}</strong></p>
          <p style="margin:8px 0 0;color:#94a3b8;">Limit: <strong style="color:#00e676;">$${limit.toFixed(2)}</strong></p>
        </div>
        <a href="${process.env.CLIENT_URL}/budgets" style="display:inline-block;background:linear-gradient(135deg,#ffb74d,#ff5252);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Budgets</a>
      </div>`,
  }),

  welcome: (name) => ({
    subject: '🎉 Welcome to ExpenseTracker!',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;background:#1a1a2e;border-radius:16px;padding:40px;color:#e2e8f0;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:24px;background:linear-gradient(135deg,#6c63ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">💰 ExpenseTracker</h1>
        </div>
        <h2 style="color:#00e676;margin-bottom:8px;">Welcome, ${name}! 🎉</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Your account is verified and ready. Start tracking your expenses and take control of your finances today!</p>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#00d4ff);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Go to Dashboard →</a>
      </div>`,
  }),
};

const sendEmail = async ({ to, template, data }) => {
  try {
    const transporter = createTransporter();
    const { subject, html } = emailTemplates[template](...data);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    logger.info(`📧 Email sent: ${template} → ${to}`);
    return true;
  } catch (error) {
    logger.error(`❌ Email failed: ${error.message}`);
    return false;
  }
};

module.exports = sendEmail;
