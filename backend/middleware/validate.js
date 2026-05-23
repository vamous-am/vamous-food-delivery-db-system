const { errorResponse } = require('../utils/response');
const logger = require('../config/logger');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn('Validation failed', {
      path: req.originalUrl,
      method: req.method,
      errors,
    });

    return errorResponse(res, 'Validation failed', 400, errors);
  }

  req.body = result.data;
  next();
};

module.exports = validate;
