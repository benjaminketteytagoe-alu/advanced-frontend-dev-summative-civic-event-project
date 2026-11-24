import { validationResult } from 'express-validator';

// Stop the request if any check in the routes file failed
const validateBody = (req, res, next) => {
    // Only the first problem per field, so a box never gets two messages
    const problems = validationResult(req).array({ onlyFirstError: true });
    if (problems.length === 0) return next();

    const errors = problems.map((p) => ({ field: p.path, message: p.msg }));
    return res.status(400).json({ status: 400, message: 'Validation failed', errors });
};

export default validateBody;
