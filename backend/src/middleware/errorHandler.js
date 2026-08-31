export function errorHandler(err, req, res, next) {
  if (!err.statusCode || err.statusCode >= 500) {
    console.error(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    status: 'error',
    message,
  });
}
