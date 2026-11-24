import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/events.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadEventImage } from '../middlewares/upload.middleware.js';

const router = express.Router();

// Year, month and day must all be there, like 2027-01-31 or 2027-01-31T10:00:00Z
const FULL_DATE = /^\d{4}-\d{2}-\d{2}/;

// False only when the end comes before the start. A missing or broken date is caught by the other rules
function endIsFine(end, { req }) {
    return !(new Date(end) < new Date(req.body.starts_at));
}

// A new event must send all four
const needed = [
    body('title').exists().withMessage('Title is required'),
    body('location').exists().withMessage('Location is required'),
    body('starts_at').notEmpty().withMessage('Start date/time is required'),
    body('ends_at').notEmpty().withMessage('End date/time is required'),
];

// Whatever is sent must make sense. optional() skips a field that was not sent
const rules = [
    body('title').optional().trim().notEmpty().withMessage('Title is required'),
    body('location').optional().trim().notEmpty().withMessage('Location is required'),

    body('starts_at').optional()
        .matches(FULL_DATE).withMessage('Start date/time is not a valid date').bail()
        .isISO8601({ strict: true }).withMessage('Start date/time is not a valid date'),

    body('ends_at').optional()
        .matches(FULL_DATE).withMessage('End date/time is not a valid date').bail()
        .isISO8601({ strict: true }).withMessage('End date/time is not a valid date').bail()
        .custom(endIsFine).withMessage('End date/time must not be before the start'),
];

// Anyone logged in
router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.get);

// Admins only
router.post('/', authenticate, authorize(['admin']), uploadEventImage.single('image'), needed, rules, validateBody, controller.create);
router.put('/:id', authenticate, authorize(['admin']), uploadEventImage.single('image'), rules, validateBody, controller.update);
router.delete('/:id', authenticate, authorize(['admin']), controller.remove);

export default router;
