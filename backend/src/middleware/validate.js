import { AppError } from './errorHandler.js';

/**
 * Basic regex for valid email format
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;

  const dotIndex = trimmed.indexOf('.', atIndex);
  if (dotIndex <= atIndex + 1 || dotIndex === trimmed.length - 1) return false;

  return !/\s/.test(trimmed);
};

/**
 * Middleware factory to validate required fields in req.body
 * @param {string[]} requiredFields 
 */
export function validateRequired(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return next(new AppError(`Missing required field(s): ${missing.join(', ')}`, 400));
    }
    next();
  };
}

/**
 * Middleware validator for user registration
 */
export function validateRegister(req, res, next) {
  const { email, password, name } = req.body;

  if (!email || !isValidEmail(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Name is required', 400));
  }

  next();
}

/**
 * Middleware validator for user login
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  if (!password || typeof password !== 'string') {
    return next(new AppError('Password is required', 400));
  }

  next();
}

export default {
  isValidEmail,
  validateRequired,
  validateRegister,
  validateLogin,
};
