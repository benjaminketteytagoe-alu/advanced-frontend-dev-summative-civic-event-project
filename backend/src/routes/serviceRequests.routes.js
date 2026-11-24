import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/serviceRequests.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { SERVICE_TYPES } from '../utils/serviceTypes.js';

const router = express.Router();

const createRules = [
    body('type').isIn(SERVICE_TYPES).withMessage('Choose a type from the list'),
    body('location').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Location must be 3 to 200 characters'),
    body('description').isString().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10 to 1000 characters'),
];

const updateRules = [
    body('status').isIn(['open', 'in_progress', 'done', 'declined']).withMessage('Choose a status from the list'),
    body('reply').optional().isString().trim().isLength({ max: 500 }).withMessage('Reply must be 500 characters or fewer'),
];

// Anyone logged in
router.get('/types', authenticate, controller.types);
router.get('/mine', authenticate, controller.mine);
router.post('/', authenticate, createRules, validateBody, controller.create);

// Admins only
router.get('/', authenticate, authorize(['admin']), controller.list);
router.patch('/:id', authenticate, authorize(['admin']), updateRules, validateBody, controller.update);

export default router;
