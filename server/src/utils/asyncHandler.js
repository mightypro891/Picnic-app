/**
 * Express 4 does not automatically forward rejected promises from async
 * route handlers to the error-handling middleware. Wrapping every handler
 * with this ensures a thrown/rejected error in any controller always
 * reaches errorHandler.js instead of leaving the request hanging.
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
