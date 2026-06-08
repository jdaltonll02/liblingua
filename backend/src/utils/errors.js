class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const errors = {
  VALIDATION_ERROR: (msg) => new AppError(msg, 400, 'VALIDATION_ERROR'),
  UNAUTHORIZED: () => new AppError('Unauthorized', 401, 'UNAUTHORIZED'),
  FORBIDDEN: () => new AppError('Forbidden', 403, 'FORBIDDEN'),
  NOT_FOUND: (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  CONFLICT: (msg) => new AppError(msg, 409, 'CONFLICT'),
  RATE_LIMIT: () => new AppError('Too many requests', 429, 'RATE_LIMIT'),
  SERVER_ERROR: (msg = 'Internal server error') => new AppError(msg, 500, 'SERVER_ERROR'),
  DATABASE_ERROR: () => new AppError('Database error', 500, 'DATABASE_ERROR'),
};

module.exports = { AppError, errors };
