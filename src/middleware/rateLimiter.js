/**
 * Rate Limiter Middleware
 * Protects API from abuse and limits Gemini API calls to prevent key exhaustion
 */
const rateLimit = require('express-rate-limit');

// General API rate limiter — 50 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip // Rate limit per IP address
});

// Strict rate limiter for Gemini API calls
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 25, // 15 Gemini calls per minute (free tier limit)
  message: { error: 'AI service rate limit reached, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip // Use user ID if authenticated, fallback to IP
});

// Auth endpoints rate limiter (stricter) — per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 10 login attempts per 15 min
  message: { error: 'Too many authentication attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip // Rate limit per IP address
});

module.exports = { apiLimiter, geminiLimiter, authLimiter };