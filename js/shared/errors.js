// An error the page is allowed to see. `code` is one of the Firebase callable codes
// (invalid-argument, not-found, permission-denied, failed-precondition, resource-exhausted, unauthenticated, internal).
// `details` carries a short machine reason, e.g. { reason: 'wrong-code', triesLeft: 3 }.
export class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
