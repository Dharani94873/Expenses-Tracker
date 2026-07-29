const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate short-lived access token (15m)
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: 'access' }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
  });
};

/**
 * Generate long-lived refresh token (7d)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

/**
 * Generate a cryptographically secure OTP (6 digits)
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate a secure reset token
 */
const generateResetToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
  generateResetToken,
};
