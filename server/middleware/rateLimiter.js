const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    // Vercel sits behind a proxy — trust X-Forwarded-For
    keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
  });

// Auth endpoints: 10 requests per 15 minutes
const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many auth attempts. Please try again in 15 minutes.'
);

// General API: 100 requests per 15 minutes
const apiLimiter = createLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests. Please slow down.'
);

// Upload endpoints: 20 per hour
const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many uploads. Please try again later.'
);

module.exports = { authLimiter, apiLimiter, uploadLimiter };
