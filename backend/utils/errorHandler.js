function asyncHandler(routeHandler) {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

class ValidationError extends ApiError {
  constructor(message = "Validation failed") {
    super(400, message);
  }
}

class DatabaseError extends ApiError {
  constructor(message = "Database error occurred") {
    super(500, message);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized access") {
    super(401, message);
  }
}

module.exports = {
  asyncHandler,
  ApiError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  UnauthorizedError,
};
