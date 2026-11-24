import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/auth.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';

const router = express.Router();

// The controller also checks for a capital, a small letter, a number and a special character
const signupRules = [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().withMessage('Password is required').notEmpty().withMessage('Password is required'),
];

// No login needed for these two
router.post('/signup', signupRules, validateBody, controller.signup);
router.post('/login', loginRules, validateBody, controller.login);

export default router;
