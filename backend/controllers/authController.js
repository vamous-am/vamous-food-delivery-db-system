const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
// Helper function: Generate Token with strong payload
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};
// 1. POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    // SECURITY: We do NOT extract 'role'. Users cannot make themselves admins.
    const { name, email, password } = req.body;
    // VALIDATION 1: Check for missing fields
    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email, and password are required', 400);
    }
    // VALIDATION 2: Check email format
    if (!email.includes('@')) {
      return errorResponse(res, 'Invalid email format', 400);
    }
    // VALIDATION 3: Check password strength
    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters', 400);
    }
    // VALIDATION 4: Prevent duplicate emails
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 'Email already in use', 400);
    }
    // Hash password & Create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'customer' // SECURITY: Forced to customer. Admins must be made via database directly.
    });
    const token = signToken(newUser);
    // Standardized Success Response
    return successResponse(res, {
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};
// 2. POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // VALIDATION: Check for missing fields
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }
    const token = signToken(user);
    // Standardized Success Response
    return successResponse(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
};
// 3. GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // SECURITY: Never send back the hash
    });
    return successResponse(res, { user }, 'Success', 200);
  } catch (error) {
    next(error);
  }
};
