import * as Dashboard from '../models/dashboard.model.js';

// The admin's numbers (admins only, set in the routes file)
export const getAdminDashboard = async (req, res, next) => {
    try {
        const data = await Dashboard.getAdminStats();
        return res.status(200).json({ status: 200, message: 'Admin dashboard data fetched successfully', data });
    } catch (err) {
        next(err);
    }
};

// The logged in person's own numbers
export const getUserDashboard = async (req, res, next) => {
    try {
        const data = await Dashboard.getUserStats(req.user.id);
        return res.status(200).json({ status: 200, message: 'User dashboard data fetched successfully', data });
    } catch (err) {
        next(err);
    }
};
