export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Resource not found' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Unexpected error';
  const details = err.details || undefined;
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(status).json({ error: message, details });
}
