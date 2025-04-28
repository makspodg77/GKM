const { ApiError } = require("../utils/errorHandler");

function errorMiddleware(err, req, res, next) {
  console.error(err.stack);

  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

module.exports = errorMiddleware;
