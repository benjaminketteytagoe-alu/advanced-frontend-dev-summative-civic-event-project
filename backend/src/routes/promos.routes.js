import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/promos.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadPromoVideo } from '../middlewares/upload.middleware.js';

const router = express.Router();

// Checks for both new and edited ones
const rules = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('caption_text').trim().notEmpty().withMessage('Caption text is required'),
    body('published').optional().isBoolean().withMessage('Published must be true or false'),
];

// Anyone logged in
router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.get);

// Admins only
router.post('/', authenticate, authorize(['admin']), uploadPromoVideo.single('video'), rules, validateBody, controller.create);
router.put('/:id', authenticate, authorize(['admin']), uploadPromoVideo.single('video'), rules, validateBody, controller.update);
router.patch('/:id/publish', authenticate, authorize(['admin']), controller.publishPromo);
router.patch('/:id/unpublish', authenticate, authorize(['admin']), controller.unpublishPromo);
router.delete('/:id', authenticate, authorize(['admin']), controller.remove);

export default router;
