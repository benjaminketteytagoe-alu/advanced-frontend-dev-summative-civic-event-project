import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as Users from '../models/users.model.js';

// Stop the server if the secret is missing, since a guessable one lets people fake tokens
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET is missing. Add it to backend/.env');

// 8 or more characters, with a small letter, a capital, a number and a special character
function strongPassword(password) {
    return password.length >= 8
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /[0-9]/.test(password)
        && /[^A-Za-z0-9]/.test(password);
}

// Only the details that are safe to send back (never the password hash)
function safeUser(user) {
    return { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
}

// Every failed reply has the same shape
function fail(res, status, message) {
    return res.status(status).json({ status, message });
}

// Create an account
export const signup = async (req, res, next) => {
    try {
        // role is left out on purpose, so nobody can sign up as an admin
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) return fail(res, 400, 'Missing required fields');

        if (typeof password !== 'string' || !strongPassword(password)) {
            return fail(res, 400, 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.');
        }

        const taken = await Users.findByEmail(email);
        if (taken) return fail(res, 409, 'Email already in use');

        const password_hash = await bcrypt.hash(password, 10);
        const user = await Users.createUser({ full_name, email, password_hash });

        return res.status(201).json({ status: 201, message: 'User created successfully', data: safeUser(user) });
    } catch (err) {
        next(err);
    }
};

// Check the email and password, then give back a token
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return fail(res, 400, 'Email and password required');

        // The same message for both, so nobody can tell which emails exist
        const user = await Users.findByEmail(email);
        if (!user) return fail(res, 401, 'Invalid credentials');

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return fail(res, 401, 'Invalid credentials');

        if (user.is_active === false) {
            return fail(res, 403, 'Your account has been disabled. Please contact an administrator.');
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1h' });

        return res.status(200).json({ status: 200, message: 'Login successful', data: { token, user: safeUser(user) } });
    } catch (err) {
        next(err);
    }
};
