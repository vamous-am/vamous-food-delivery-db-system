const jwt = require('jsonwebtoken');
const { User } = require('../models');
// 1. Protect Routes: Ensures user is logged in and token is valid
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'Not authorized, no token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // SECURITY: Check if user was deleted AFTER the token was issued
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ status: 'fail', message: 'The user belonging to this token no longer exists' });
    }
    // Attach user to the request
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'fail', message: 'Invalid or expired token' });
  }
};
// 2. Role Guard: Restricts route to specific user roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied: You do not have permission to perform this action' });
    }
    next();
  };
};
