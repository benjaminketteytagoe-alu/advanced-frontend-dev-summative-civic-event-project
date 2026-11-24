import * as Registrations from '../models/eventRegistrations.model.js';
import * as Events from '../models/events.model.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// Register the logged in person for an event
export const registerForEvent = async (req, res, next) => {
    try {
        const { event_id } = req.body;

        // Nobody can register for a draft
        const event = await Events.findById(event_id);
        if (!event || event.published === false) return fail(res, 404, 'Event not found');

        const data = await Registrations.register(req.user.id, event_id);
        if (!data) return fail(res, 409, 'Already registered');

        return res.status(201).json({ status: 201, message: 'Registered successfully', data });
    } catch (err) {
        next(err);
    }
};

// Cancel a registration. Drafts are allowed here, in case the event was unpublished after someone registered
export const cancelRegistration = async (req, res, next) => {
    try {
        const { event_id } = req.body;

        const event = await Events.findById(event_id);
        if (!event) return fail(res, 404, 'Event not found');

        const data = await Registrations.cancelRegistration(req.user.id, event_id);
        if (!data) return fail(res, 404, 'Registration not found');

        return res.status(200).json({ status: 200, message: 'Registration cancelled', data });
    } catch (err) {
        next(err);
    }
};

// Who is coming to an event (admins only, set in the routes file)
export const getEventAttendees = async (req, res, next) => {
    try {
        const { event_id } = req.params;

        const event = await Events.findById(event_id);
        if (!event) return fail(res, 404, 'Event not found');

        const data = await Registrations.findByEvent(event_id);
        return res.status(200).json({ status: 200, message: 'Event attendees retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// The logged in person's own registrations
export const getUserRegistrations = async (req, res, next) => {
    try {
        const data = await Registrations.findByUser(req.user.id);
        return res.status(200).json({ status: 200, message: 'Event registrations retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};
