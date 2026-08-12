export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Resource not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message =
    status === 500
      ? 'Something went wrong on our end. Please try again shortly.'
      : err.message || 'Request failed.';
  res.status(status).json({ error: message });
}
