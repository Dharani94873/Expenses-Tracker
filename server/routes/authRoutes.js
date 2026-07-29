const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  otpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  twoFAVerifyValidator,
} = require('../middleware/validators/authValidator');

// Avatar upload storage
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'expense_tracker/avatars', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 200, height: 200, crop: 'fill' }] },
});
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });

// Public routes (rate limited)
router.post('/register', authLimiter, registerValidator, auth.register);
router.post('/verify-otp', authLimiter, otpValidator, auth.verifyOTP);
router.post('/resend-otp', authLimiter, auth.resendOTP);
router.post('/login', authLimiter, loginValidator, auth.login);
router.post('/refresh', auth.refreshToken);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, auth.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, auth.resetPassword);

// Protected routes
router.use(protect);
router.get('/me', auth.getMe);
router.put('/profile', uploadAvatar.single('avatar'), auth.updateProfile);
router.put('/change-password', auth.changePassword);
router.post('/logout', auth.logout);

// 2FA
router.post('/2fa/setup', auth.setup2FA);
router.post('/2fa/enable', twoFAVerifyValidator, auth.enable2FA);
router.delete('/2fa/disable', auth.disable2FA);

module.exports = router;
