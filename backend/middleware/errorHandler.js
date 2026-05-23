const logger = require('../config/logger');
const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
    stack:  err.stack,
    path:   req.originalUrl,
    method: req.method,
    userId: req.user?.id ?? null,
  });

  if (err.name === 'SequelizeUniqueConstraintError') {
    return errorResponse(res, 'A record with this value already exists.', 409);
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    return errorResponse(res, 'Database validation failed.', 400, errors);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return errorResponse(res, 'Referenced record does not exist.', 400);
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token has expired. Please log in again.', 401);
  }

  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;
