import * as Announcements from '../models/announcements.model.js';
import * as Notifications from '../models/notifications.model.js';
import { fileUrl, deleteFile } from '../utils/files.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// Tell everyone about an announcement (no recipient means all users)
async function tellEveryone(announcement, req) {
    await Notifications.create({
        title: 'New Announcement Published',
        message: `A new announcement titled "${announcement.title}" has been added.`,
        type: 'announcement',
        recipient_id: null,
        metadata: { announcement_id: announcement.id },
        created_by: req.user.id
    });
}

// List announcements. Admins get drafts too
export const getAllAnnouncements = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const publishedOnly = req.user.role !== 'admin';
        const data = await Announcements.findAll({ page: Number(page), limit: Number(limit), publishedOnly });
        return res.status(200).json({ status: 200, message: 'Announcements retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// Get one. To a normal user, a draft does not exist
export const getAnnouncementById = async (req, res, next) => {
    try {
        const data = await Announcements.findById(req.params.id);
        const admin = req.user.role === 'admin';
        if (!data || (!data.published && !admin)) return fail(res, 404, 'Announcement not found');
        return res.status(200).json({ status: 200, message: 'Announcement retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// Create an announcement
export const createAnnouncement = async (req, res, next) => {
    try {
        const { title, published } = req.body;
        if (!req.file) return fail(res, 400, 'Audio file is required');

        const data = await Announcements.create({ title, published, audio_url: fileUrl(req, 'announcements') });
        if (data.published) await tellEveryone(data, req);
        return res.status(201).json({ status: 201, message: 'Announcement created successfully', data });
    } catch (err) {
        next(err);
    }
};

// Change an announcement. The audio and published keep their old value when they are not sent
export const updateAnnouncement = async (req, res, next) => {
    try {
        const old = await Announcements.findById(req.params.id);
        if (!old) return fail(res, 404, 'Announcement not found');

        const { title, published = old.published } = req.body;
        const audio_url = req.file ? fileUrl(req, 'announcements') : old.audio_url;
        const data = await Announcements.update(old.id, { title, published, audio_url });

        // The old audio goes only after the new one is saved
        if (req.file) deleteFile(old.audio_url, 'announcements');
        return res.status(200).json({ status: 200, message: 'Announcement updated successfully', data });
    } catch (err) {
        next(err);
    }
};

// Delete it, and its file
export const deleteAnnouncement = async (req, res, next) => {
    try {
        const old = await Announcements.findById(req.params.id);
        if (!old) return fail(res, 404, 'Announcement not found');

        await Announcements.remove(old.id);
        deleteFile(old.audio_url, 'announcements');
        return res.status(200).json({ status: 200, message: 'Announcement deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// Publish, and tell everyone if it was hidden before
export const publishAnnouncement = async (req, res, next) => {
    try {
        const old = await Announcements.findById(req.params.id);
        if (!old) return fail(res, 404, 'Announcement not found');

        const data = await Announcements.setPublished(old.id, true);
        if (!old.published) await tellEveryone(data, req);
        return res.status(200).json({ status: 200, message: 'Announcement published successfully', data });
    } catch (err) {
        next(err);
    }
};

// Hide it from users
export const unpublishAnnouncement = async (req, res, next) => {
    try {
        const data = await Announcements.setPublished(req.params.id, false);
        if (!data) return fail(res, 404, 'Announcement not found');
        return res.status(200).json({ status: 200, message: 'Announcement unpublished successfully', data });
    } catch (err) {
        next(err);
    }
};
