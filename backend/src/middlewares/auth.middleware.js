import jwt from 'jsonwebtoken';
import * as Users from '../models/users.model.js';

// The same secret that signed the token (auth.controller.js stops the server if it is missing)
const SECRET = process.env.JWT_SECRET;

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// Give back what is inside the token, or null if it is fake or expired
function readToken(token) {
    try {
        return jwt.verify(token, SECRET);
    } catch {
        return null;
    }
}

// Is this person logged in?
export const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) return fail(res, 401, 'Authorization header missing');

        const data = readToken(header.split(' ')[1]);
        if (!data) return fail(res, 401, 'Invalid or expired token');

        // Looked up every time, so a changed role or a disabled account counts straight away
        const user = await Users.findById(data.id);
        if (!user) return fail(res, 401, 'User not found');

        if (user.is_active === false) {
            return fail(res, 401, 'Your account has been disabled. Please contact an administrator.');
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

// Is this person's role allowed here?
export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return fail(res, 403, 'Forbidden: insufficient permissions');
        next();
    };
};
