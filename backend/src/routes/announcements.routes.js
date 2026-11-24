import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/announcements.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadAudio } from '../middlewares/upload.middleware.js';

const router = express.Router();

// Checks for both new and edited ones
const rules = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('published').optional().isBoolean().withMessage('Published must be true or false'),
];

// Anyone logged in
router.get('/', authenticate, controller.getAllAnnouncements);
router.get('/:id', authenticate, controller.getAnnouncementById);

// Admins only
router.post('/', authenticate, authorize(['admin']), uploadAudio.single('audio'), rules, validateBody, controller.createAnnouncement);
router.put('/:id', authenticate, authorize(['admin']), uploadAudio.single('audio'), rules, validateBody, controller.updateAnnouncement);
router.patch('/:id/publish', authenticate, authorize(['admin']), controller.publishAnnouncement);
router.patch('/:id/unpublish', authenticate, authorize(['admin']), controller.unpublishAnnouncement);
router.delete('/:id', authenticate, authorize(['admin']), controller.deleteAnnouncement);

export default router;
