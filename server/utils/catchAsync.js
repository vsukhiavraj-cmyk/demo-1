/**
 * Higher-order function to wrap asynchronous Express route handlers.
 * It catches any errors that occur in the async function and passes them to the next middleware (Express's error handler).
 *
 * @param {Function} fn - The asynchronous function (route handler or middleware).
 * @returns {Function} A new function that wraps the original, handling errors.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;
