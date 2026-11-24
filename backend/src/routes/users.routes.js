import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/users.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// The role and the status cannot be changed from here
const rules = [
    body('full_name').optional().isString().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('email').optional().isEmail().withMessage('Must be a valid email'),
    body('role').not().exists().withMessage('Cannot update role'),
    body('is_active').not().exists().withMessage('Cannot update status'),
];

// Your own profile
router.get('/profile/me', authenticate, controller.getSelf);
router.patch('/profile/me', authenticate, rules, validateBody, controller.updateSelf);

// Admins only
router.get('/', authenticate, authorize(['admin']), controller.list);
router.get('/:id', authenticate, authorize(['admin']), controller.get);
router.patch('/:id/enable', authenticate, authorize(['admin']), controller.enable);
router.patch('/:id/disable', authenticate, authorize(['admin']), controller.disable);

export default router;
