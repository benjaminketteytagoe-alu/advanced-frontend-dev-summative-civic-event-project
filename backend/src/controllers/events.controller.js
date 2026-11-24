import fs from 'fs';
import path from 'path';
import * as Events from '../models/events.model.js';
import * as Notifications from '../models/notifications.model.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// The form sends published as text, so turn it into true, false, or undefined when it is missing
function readPublished(value) {
    if (value === undefined) return undefined;
    return value === true || value === 'true';
}

// The web address of the uploaded image
function imageUrl(req) {
    return `${req.protocol}://${req.get('host')}/uploads/events/${req.file.filename}`;
}

// Delete an old image from the uploads folder
function deleteImage(url) {
    if (!url) return;
    const file = path.join(process.cwd(), 'uploads', 'events', path.basename(url));
    if (fs.existsSync(file)) fs.unlinkSync(file);
}

// Tell everyone about an event (no recipient means all users)
async function tellEveryone(event, req) {
    await Notifications.create({
        title: 'New Event Published',
        message: `A new event titled "${event.title}" has been added!`,
        type: 'event',
        recipient_id: null,
        metadata: { event_id: event.id },
        created_by: req.user.id
    });
}

// Create an event
export const create = async (req, res, next) => {
    try {
        const { title, description, location, starts_at, ends_at } = req.body;
        const published = readPublished(req.body.published);
        const metadata = {};
        if (req.file) metadata.image_url = imageUrl(req);

        const event = await Events.create({ title, description, location, starts_at, ends_at, metadata, published });
        if (event.published) await tellEveryone(event, req);

        return res.status(201).json({
            status: 201,
            message: event.published ? 'Event created successfully and notification sent' : 'Event saved as a draft',
            data: event
        });
    } catch (err) {
        next(err);
    }
};

// List events. Admins get drafts too
export const list = async (req, res, next) => {
    try {
        const admin = req.user.role === 'admin';
        const data = admin ? await Events.findAll() : await Events.findPublished();

        return res.status(200).json({ status: 200, message: 'Events fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// Get one event. To a normal user, a draft does not exist
export const get = async (req, res, next) => {
    try {
        const event = await Events.findById(req.params.id);
        if (!event) return fail(res, 404, 'Event not found');

        const admin = req.user.role === 'admin';
        if (event.published === false && !admin) return fail(res, 404, 'Event not found');

        return res.status(200).json({ status: 200, message: 'Event fetched successfully', data: event });
    } catch (err) {
        next(err);
    }
};

// Change an event. Anything not sent keeps its old value
export const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const old = await Events.findById(id);
        if (!old) return fail(res, 404, 'Event not found');

        const { title, description, location, starts_at, ends_at } = req.body;
        const published = readPublished(req.body.published);
        const metadata = { ...old.metadata };
        if (req.file) metadata.image_url = imageUrl(req);

        const event = await Events.update(id, {
            title: title ?? old.title,
            description: description ?? old.description,
            location: location ?? old.location,
            starts_at: starts_at ?? old.starts_at,
            ends_at: ends_at ?? old.ends_at,
            metadata,
            published
        });

        // Only after the save worked, so a failed save never loses the old image
        if (req.file) deleteImage(old.metadata?.image_url);

        // Only when a draft goes live, so normal edits stay quiet
        if (old.published === false && event.published) await tellEveryone(event, req);

        return res.status(200).json({ status: 200, message: 'Event updated successfully', data: event });
    } catch (err) {
        next(err);
    }
};

// Delete an event
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await Events.findById(id);
        if (!event) return fail(res, 404, 'Event not found');

        await Events.remove(id);

        return res.status(200).json({
            status: 200,
            message: 'Event deleted successfully',
            data: { id, title: event.title }
        });
    } catch (err) {
        next(err);
    }
};
