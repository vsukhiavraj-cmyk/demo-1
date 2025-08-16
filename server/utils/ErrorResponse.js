/**
 * Custom Error class for API responses.
 * Extends the native Error class and adds a statusCode property.
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent Error constructor with the message
    this.statusCode = statusCode; // Add a custom statusCode property
  }
}

export default ErrorResponse;
