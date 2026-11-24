import * as Requests from '../models/serviceRequests.model.js';
import * as Notifications from '../models/notifications.model.js';
import { SERVICE_TYPES } from '../utils/serviceTypes.js';

// The words people see for each status
const WORDS = { open: 'open', in_progress: 'in progress', done: 'done', declined: 'declined' };

// Tell only the person who sent the request
async function tellSender(request, admin) {
    await Notifications.create({
        title: 'Service request updated',
        message: `Your ${request.type} request is now ${WORDS[request.status]}.`,
        type: 'service',
        recipient_id: request.user_id,
        metadata: { service_request_id: request.id },
        created_by: admin.id
    });
}

// The kinds of problem to choose from
export const types = (req, res) => {
    return res.status(200).json({ status: 200, message: 'Types fetched successfully', data: SERVICE_TYPES });
};

// Send a request
export const create = async (req, res, next) => {
    try {
        const { type, location, description } = req.body;
        const data = await Requests.create({ user_id: req.user.id, type, location, description });
        return res.status(201).json({ status: 201, message: 'Request sent', data });
    } catch (err) {
        next(err);
    }
};

// The logged in person's own requests
export const mine = async (req, res, next) => {
    try {
        const data = await Requests.findByUser(req.user.id);
        return res.status(200).json({ status: 200, message: 'Requests fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// Everyone's requests (admins only, set in the routes file)
export const list = async (req, res, next) => {
    try {
        const data = await Requests.findAll();
        return res.status(200).json({ status: 200, message: 'Requests fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// Change the status and reply (admins only, set in the routes file)
export const update = async (req, res, next) => {
    try {
        const { status, reply = '' } = req.body;
        const data = await Requests.update(req.params.id, { status, reply });
        if (!data) return res.status(404).json({ status: 404, message: 'Request not found' });

        await tellSender(data, req.user);
        return res.status(200).json({ status: 200, message: 'Request updated', data });
    } catch (err) {
        next(err);
    }
};
