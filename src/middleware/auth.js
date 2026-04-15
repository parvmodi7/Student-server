/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */
const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      );

      req.user = decoded;
      
      // Check if user has required role
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

module.exports = auth;