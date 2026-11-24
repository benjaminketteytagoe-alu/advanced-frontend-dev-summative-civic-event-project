import * as Notifications from '../models/notifications.model.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// No recipient means it is for everyone
function isFor(note, user) {
    return note.recipient_id === null || note.recipient_id === user.id;
}

// The logged in person's notifications, theirs and the ones for everyone
export const list = async (req, res, next) => {
    try {
        const data = await Notifications.findAllForUser(req.user.id);
        return res.status(200).json({ status: 200, message: 'Notifications fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// One notification. Someone else's private one does not exist as far as you know
export const get = async (req, res, next) => {
    try {
        const data = await Notifications.findById(req.params.id);
        if (!data || !isFor(data, req.user)) return fail(res, 404, 'Notification not found');

        return res.status(200).json({ status: 200, message: 'Notification fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// Delete a notification (admins only, set in the routes file)
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const found = await Notifications.findById(id);
        if (!found) return fail(res, 404, 'Notification not found');

        await Notifications.remove(id);
        return res.status(200).json({ status: 200, message: 'Notification deleted successfully' });
    } catch (err) {
        next(err);
    }
};
