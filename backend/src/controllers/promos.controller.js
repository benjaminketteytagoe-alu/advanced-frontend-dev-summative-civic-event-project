import * as Promos from '../models/promos.model.js';
import * as Notifications from '../models/notifications.model.js';
import { fileUrl, deleteFile } from '../utils/files.js';
import { normalizeVideoLink, VIDEO_LINK_ERROR } from '../utils/videoLink.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// The same, and it says which box was wrong
function badLink(res) {
    const errors = [{ field: 'video_link', message: VIDEO_LINK_ERROR }];
    return res.status(400).json({ status: 400, message: VIDEO_LINK_ERROR, errors });
}

// Tell everyone about a promo (no recipient means all users)
async function tellEveryone(promo, req) {
    await Notifications.create({
        title: 'New Promo Added!',
        message: `A new promo titled "${promo.title}" has been published.`,
        type: 'promo',
        recipient_id: null,
        metadata: { promo_id: promo.id },
        created_by: req.user.id
    });
}

// A new upload, or a YouTube or Vimeo link. Null means the link is not a good one,
// and undefined means no video was sent
function sentVideo(req) {
    if (req.file) return fileUrl(req, 'promos');
    if (!req.body.video_link) return undefined;
    const link = normalizeVideoLink(req.body.video_link);
    return link ? link.url : null;
}

// List promos. Admins get drafts too
export const list = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const publishedOnly = req.user.role !== 'admin';
        const { promos, pagination } = await Promos.findAll({ page: Number(page), limit: Number(limit), publishedOnly });
        return res.status(200).json({ status: 200, message: 'Promos fetched successfully', data: promos, pagination });
    } catch (err) {
        next(err);
    }
};

// Get one. To a normal user, a draft does not exist
export const get = async (req, res, next) => {
    try {
        const data = await Promos.findById(req.params.id);
        const admin = req.user.role === 'admin';
        if (!data || (!data.published && !admin)) return fail(res, 404, 'Promo not found');
        return res.status(200).json({ status: 200, message: 'Promo fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// Create a promo
export const create = async (req, res, next) => {
    try {
        const { title, description, caption_text, published } = req.body;
        const video_url = sentVideo(req);
        if (video_url === null) return badLink(res);
        if (!video_url) return fail(res, 400, 'Upload a video file or paste a YouTube or Vimeo link');

        const data = await Promos.create({ title, description, caption_text, video_url, published, created_by: req.user.id });
        if (data.published) await tellEveryone(data, req);
        return res.status(201).json({ status: 201, message: 'Promo created successfully', data });
    } catch (err) {
        next(err);
    }
};

// Change a promo. The video and published keep their old value when they are not sent
export const update = async (req, res, next) => {
    try {
        const old = await Promos.findById(req.params.id);
        if (!old) return fail(res, 404, 'Promo not found');

        const { title, description, caption_text, published = old.published } = req.body;
        const video_url = sentVideo(req);
        if (video_url === null) return badLink(res);

        const data = await Promos.update(old.id, { title, description, caption_text, published, video_url: video_url || old.video_url });

        // The old video goes only after the new one is saved
        if (data.video_url !== old.video_url) deleteFile(old.video_url, 'promos');
        return res.status(200).json({ status: 200, message: 'Promo updated successfully', data });
    } catch (err) {
        next(err);
    }
};

// Delete it, and its file
export const remove = async (req, res, next) => {
    try {
        const old = await Promos.findById(req.params.id);
        if (!old) return fail(res, 404, 'Promo not found');

        await Promos.remove(old.id);
        deleteFile(old.video_url, 'promos');
        return res.status(200).json({ status: 200, message: 'Promo deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// Publish, and tell everyone if it was hidden before
export const publishPromo = async (req, res, next) => {
    try {
        const old = await Promos.findById(req.params.id);
        if (!old) return fail(res, 404, 'Promo not found');

        const data = await Promos.setPublished(old.id, true);
        if (!old.published) await tellEveryone(data, req);
        return res.status(200).json({ status: 200, message: 'Promo published successfully', data });
    } catch (err) {
        next(err);
    }
};

// Hide it from users
export const unpublishPromo = async (req, res, next) => {
    try {
        const data = await Promos.setPublished(req.params.id, false);
        if (!data) return fail(res, 404, 'Promo not found');
        return res.status(200).json({ status: 200, message: 'Promo unpublished successfully', data });
    } catch (err) {
        next(err);
    }
};
