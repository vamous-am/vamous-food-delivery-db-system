const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
// Helper function: Generate Token with strong payload
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' } // <-- Fallback added here
  );
};
// 1. POST /api/auth/register
exports.register = async (req, res) => {
  try {
    // SECURITY: We do NOT extract 'role'. Users cannot make themselves admins.
    const { name, email, password } = req.body;
    // VALIDATION 1: Check for missing fields
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Name, email, and password are required' });
    }
    // VALIDATION 2: Check email format
    if (!email.includes('@')) {
      return res.status(400).json({ status: 'fail', message: 'Invalid email format' });
    }
    // VALIDATION 3: Check password strength
    if (password.length < 6) {
      return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters' });
    }
    // VALIDATION 4: Prevent duplicate emails
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already in use' });
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
    res.status(201).json({
      status: 'success',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
// 2. POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // VALIDATION: Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Email and password are required' });
    }
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
    }
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
    }
    const token = signToken(user);
    // Standardized Success Response
    res.status(200).json({
      status: 'success',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
// 3. GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // SECURITY: Never send back the hash
    });
    res.status(200).json({ status: 'success', user });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};
