import * as Feedback from '../models/eventFeedback.model.js';
import * as Events from '../models/events.model.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// A rating is a whole number from 1 to 5
function goodRating(rating) {
    const n = Number(rating);
    return Number.isInteger(n) && n >= 1 && n <= 5;
}

// Leave a review
export const createFeedback = async (req, res, next) => {
    try {
        const { event_id, rating, comment } = req.body;
        if (!goodRating(rating)) return fail(res, 400, 'Rating must be a whole number from 1 to 5');

        // Nobody can review a draft
        const event = await Events.findById(event_id);
        if (!event || event.published === false) return fail(res, 404, 'Event not found');

        // A second review for the same event gets 409 from the shared error code
        const data = await Feedback.createFeedback({ user_id: req.user.id, event_id, rating, comment });
        return res.status(201).json({ status: 201, message: 'Feedback submitted', data });
    } catch (err) {
        next(err);
    }
};

// Change your own review
export const updateFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        if (!goodRating(rating)) return fail(res, 400, 'Rating must be a whole number from 1 to 5');

        // Look for this review among the person's own ones
        const mine = await Feedback.findByUser(req.user.id);
        const found = mine.find((review) => review.id === id);
        if (!found) return fail(res, 403, 'Cannot update this feedback');

        const data = await Feedback.updateFeedback(id, { rating, comment });
        return res.status(200).json({ status: 200, message: 'Feedback updated', data });
    } catch (err) {
        next(err);
    }
};

// Every review of an event (admins only, set in the routes file)
export const getEventFeedback = async (req, res, next) => {
    try {
        const { event_id } = req.params;

        const event = await Events.findById(event_id);
        if (!event) return fail(res, 404, 'Event not found');

        const data = await Feedback.findByEvent(event_id);
        return res.status(200).json({ status: 200, message: 'Event feedback retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// The logged in person's own reviews
export const getUserFeedback = async (req, res, next) => {
    try {
        const data = await Feedback.findByUser(req.user.id);
        return res.status(200).json({ status: 200, message: 'Your feedback retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};
