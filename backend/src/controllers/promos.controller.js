import * as Promos from '../models/promos.model.js';
import * as Notifications from '../models/notifications.model.js';
import * as PromoModel from '../models/promos.model.js';
import { normalizeVideoLink, VIDEO_LINK_ERROR } from '../utils/videoLink.js';

/**
 * Get all promos (paginated)
 */
export const list = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await Promos.findAll({ page: Number(page), limit: Number(limit), publishedOnly: req.user.role !== 'admin' });
        return res.status(200).json({
            status: 200,
            message: 'Promos fetched successfully',
            data: result.promos,
            pagination: result.pagination,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get a single promo by ID
 */
export const get = async (req, res, next) => {
    try {
        const promo = await Promos.findById(req.params.id);
        // Unpublished promos are only visible to admins
        if (!promo || (promo.published === false && req.user.role !== 'admin')) {
            return res.status(404).json({ status: 404, message: 'Promo not found' });
        }
        return res.status(200).json({ status: 200, data: promo });
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new promo (admin only)
 */
export const create = async (req, res, next) => {
    try {
        const { title, description, caption_text, video_link } = req.body;
        const created_by = req.user.id;

        // A promo's video is either an uploaded file or a YouTube/Vimeo link
        let video_url;
        if (req.file) {
            video_url = `${req.protocol}://${req.get('host')}/uploads/promos/${req.file.filename}`;
        } else if (video_link) {
            const link = normalizeVideoLink(video_link);
            if (!link) {
                return res.status(400).json({ status: 400, message: VIDEO_LINK_ERROR, errors: [{ field: 'video_link', message: VIDEO_LINK_ERROR }] });
            }
            video_url = link.url;
        } else {
            return res.status(400).json({ status: 400, message: 'Upload a video file or paste a YouTube or Vimeo link' });
        }

        const promo = await Promos.create({
            title,
            description,
            caption_text,
            video_url,
            created_by,
        });

        // Create notification
        await Notifications.create({
            title: 'New Promo Added!',
            message: `A new promo titled "${promo.title}" has been published.`,
            type: 'promo',
            recipient_id: null, // null => broadcast to all
            metadata: { promo_id: promo.id },
            created_by,
        });

        return res.status(201).json({
            status: 201,
            message: 'Promo created successfully',
            data: promo,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Update an existing promo
 */
export const update = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existingPromo = await Promos.findById(id);
        if (!existingPromo) {
            return res.status(404).json({ status: 404, message: 'Promo not found' });
        }

        const fieldsToUpdate = {
            title: req.body.title,
            description: req.body.description,
            caption_text: req.body.caption_text,
            published: req.body.published,
        };

        // Optional: replace the video with a new upload or a YouTube/Vimeo link
        if (req.file) {
            fieldsToUpdate.video_url = `${req.protocol}://${req.get('host')}/uploads/promos/${req.file.filename}`;
        } else if (req.body.video_link) {
            const link = normalizeVideoLink(req.body.video_link);
            if (!link) {
                return res.status(400).json({ status: 400, message: VIDEO_LINK_ERROR, errors: [{ field: 'video_link', message: VIDEO_LINK_ERROR }] });
            }
            fieldsToUpdate.video_url = link.url;
        }

        const updated = await Promos.update(id, fieldsToUpdate);

        return res.status(200).json({
            status: 200,
            message: 'Promo updated successfully',
            data: updated,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a promo
 */
export const remove = async (req, res, next) => {
    try {
        const promo = await Promos.findById(req.params.id);
        if (!promo) {
            return res.status(404).json({ status: 404, message: 'Promo not found' });
        }

        await Promos.remove(req.params.id);

        return res.status(200).json({
            status: 200,
            message: 'Promo deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Publish a promo
 */
export const publishPromo = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if promo exists
        const existing = await PromoModel.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Promo not found',
            });
        }

        const promo = await PromoModel.publish(id);

        // Optional: create a notification when published
        await Notifications.create({
            title: 'Promo Published',
            message: `The promo "${promo.title}" is now live.`,
            type: 'promo',
            recipient_id: null,
            metadata: { promo_id: promo.id },
            created_by: req.user?.id || null
        });

        return res.status(200).json({
            status: 200,
            message: 'Promo published successfully',
            data: promo,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unpublish a promo
 */
export const unpublishPromo = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if promo exists
        const existing = await PromoModel.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Promo not found',
            });
        }
        
        const promo = await PromoModel.unpublish(id);

        return res.status(200).json({
            status: 200,
            message: 'Promo unpublished successfully',
            data: promo,
        });
    } catch (error) {
        next(error);
    }
};
