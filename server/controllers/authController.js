const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const Category = require('../models/Category');
const { generateAccessToken, generateRefreshToken, generateOTP, generateResetToken } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// ─── Register ────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    isVerified: true, // Auto-verify without OTP
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully! You can now log in.',
    email,
  });
};

// ─── Verify OTP ──────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+otp +otpExpiry');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.isVerified) {
    return res.status(400).json({ success: false, message: 'Email already verified' });
  }

  if (!user.otp || user.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  if (user.otpExpiry < Date.now()) {
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  await sendEmail({ to: email, template: 'welcome', data: [user.name] });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Email verified successfully!',
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
  });
};

// ─── Resend OTP ──────────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).select('+otp +otpExpiry');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified' });

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendEmail({ to: email, template: 'otp', data: [user.name, otp] });

  let message = 'New OTP sent to your email';
  if (!process.env.EMAIL_HOST) {
    message = `(TEST MODE) Your New OTP is: ${otp}`;
  }

  res.json({ success: true, message });
};

// ─── Login ───────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password, twoFAToken } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +twoFASecret +refreshToken');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Account lock check
  if (user.isLocked) {
    return res.status(423).json({
      success: false,
      message: 'Account temporarily locked. Try again later.',
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Verification check removed so older unverified test accounts can still log in

  // 2FA check
  if (user.twoFAEnabled) {
    if (!twoFAToken) {
      return res.status(200).json({ success: false, requires2FA: true, message: '2FA token required' });
    }
    const secret = decrypt(user.twoFASecret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: twoFAToken, window: 1 });
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
    }
  }

  // Reset failed attempts on success
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      currency: user.currency,
      twoFAEnabled: user.twoFAEnabled,
      notificationPreferences: user.notificationPreferences,
    },
  });
};

// ─── Refresh Token ───────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return res.status(401).json({ success: false, message: 'Refresh token revoked' });
  }

  const accessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, accessToken });
};

// ─── Logout ──────────────────────────────────────────────────
exports.logout = async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshToken');
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

// ─── Forgot Password ─────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return 200 to prevent email enumeration
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  }

  const { raw, hash } = generateResetToken();
  user.resetPasswordToken = hash;
  user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${raw}`;
  await sendEmail({ to: email, template: 'passwordReset', data: [user.name, resetUrl] });

  res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
};

// ─── Reset Password ──────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hash,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  user.passwordHash = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  user.refreshToken = null; // Invalidate all sessions
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. Please log in.' });
};

// ─── Get Current User ────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// ─── Update Profile ──────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const allowedFields = ['name', 'currency', 'notificationPreferences'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (req.file) {
    updates.avatarUrl = req.file.path; // Cloudinary URL
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, user });
};

// ─── Change Password ─────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.passwordHash = newPassword;
  user.refreshToken = null;
  await user.save();

  res.json({ success: true, message: 'Password changed. Please log in again.' });
};

// ─── 2FA Setup ───────────────────────────────────────────────
exports.setup2FA = async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `ExpenseTracker (${req.user.email})`, length: 20 });
  const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);

  // Store encrypted secret temporarily (user must verify before enabling)
  await User.findByIdAndUpdate(req.user._id, {
    twoFASecret: encrypt(secret.base32),
    twoFAEnabled: false,
  });

  res.json({ success: true, qrCode: qrDataUrl, secret: secret.base32 });
};

// ─── Enable 2FA ──────────────────────────────────────────────
exports.enable2FA = async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+twoFASecret');

  if (!user.twoFASecret) {
    return res.status(400).json({ success: false, message: 'Please set up 2FA first' });
  }

  const secret = decrypt(user.twoFASecret);
  const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });

  if (!valid) {
    return res.status(400).json({ success: false, message: 'Invalid verification code' });
  }

  user.twoFAEnabled = true;
  await user.save();

  res.json({ success: true, message: '2FA enabled successfully' });
};

// ─── Disable 2FA ─────────────────────────────────────────────
exports.disable2FA = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    twoFAEnabled: false,
    twoFASecret: null,
  });
  res.json({ success: true, message: '2FA disabled' });
};
