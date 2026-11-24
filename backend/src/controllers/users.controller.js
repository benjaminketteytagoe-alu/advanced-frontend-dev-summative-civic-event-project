import * as Users from '../models/users.model.js';

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// List users (admins only, set in the routes file)
export const list = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await Users.findAll({ page: Number(page), limit: Number(limit) });
        return res.status(200).json({ status: 200, message: 'Users retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// One user (admins only)
export const get = async (req, res, next) => {
    try {
        const data = await Users.findById(req.params.id);
        if (!data) return fail(res, 404, 'User not found');
        return res.status(200).json({ status: 200, message: 'User retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// Let someone in again (admins only)
export const enable = async (req, res, next) => {
    try {
        const data = await Users.setActive(req.params.id, true);
        if (!data) return fail(res, 404, 'User not found');
        return res.status(200).json({ status: 200, message: 'User enabled successfully', data });
    } catch (err) {
        next(err);
    }
};

// Shut someone out (admins only). An admin who disabled themselves could not undo it
export const disable = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return fail(res, 400, 'You cannot disable your own account');

        const data = await Users.setActive(id, false);
        if (!data) return fail(res, 404, 'User not found');
        return res.status(200).json({ status: 200, message: 'User disabled successfully', data });
    } catch (err) {
        next(err);
    }
};

// Your own profile. authenticate has loaded it already
export const getSelf = (req, res) => {
    return res.status(200).json({ status: 200, message: 'User profile retrieved successfully', data: req.user });
};

// Change your own name or email. Nothing else is read, so the role is safe
export const updateSelf = async (req, res, next) => {
    try {
        const { full_name, email } = req.body;

        const other = email ? await Users.findByEmail(email) : null;
        if (other && other.id !== req.user.id) return fail(res, 409, 'Email is already in use');

        const data = await Users.updateUser(req.user.id, { full_name, email });
        return res.status(200).json({ status: 200, message: 'Profile updated successfully', data });
    } catch (err) {
        next(err);
    }
};
