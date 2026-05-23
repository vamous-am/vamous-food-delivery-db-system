const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { schemas } = require('../middleware/schemas');

// Route: POST /api/auth/register
router.post('/register', validate(schemas.auth.register), authController.register);

// Route: POST /api/auth/login
router.post('/login', validate(schemas.auth.login), authController.login);

// Route: GET /api/auth/me (Protected route!)
router.get('/me', protect, authController.getMe);

module.exports = router;
