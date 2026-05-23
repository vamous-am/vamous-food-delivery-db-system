const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const ms     = Date.now() - start;
    const userId = req.user?.id ?? null;
    const level  = res.statusCode >= 500 ? 'error'
                 : res.statusCode >= 400 ? 'warn'
                 : 'info';

    logger[level](`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      ms,
      ...(userId && { userId }),
    });
  });

  next();
};

module.exports = requestLogger;
