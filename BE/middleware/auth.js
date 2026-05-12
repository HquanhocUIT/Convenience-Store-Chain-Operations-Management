// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const auth = (req.headers.authorization || '').split(' ');
  if (auth.length !== 2 || auth[0] !== 'Bearer')
    return res.status(401).json({ error: 'missing_token' });
  try {
    req.user = jwt.verify(auth[1], process.env.JWT_SECRET || 'dev_secret');
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

module.exports = { authenticate, requireAdmin };
