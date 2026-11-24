import db from '../config/db.js';

// Everything about a user except the password hash
const SAFE = 'id, full_name, email, role, is_active, created_at, updated_at';

// Save a new account. The database makes the role user
export const createUser = async ({ full_name, email, password_hash }) => {
    const { rows } = await db.query(
        `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${SAFE}`,
        [full_name, email, password_hash]
    );
    return rows[0];
};

// Find by email, capitals do not matter. This one has the password hash, for login
export const findByEmail = async (email) => {
    const { rows } = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return rows[0];
};

// One user
export const findById = async (id) => {
    const { rows } = await db.query(`SELECT ${SAFE} FROM users WHERE id = $1`, [id]);
    return rows[0];
};

// One page of users, newest first
export const findAll = async ({ page, limit }) => {
    const { rows } = await db.query(
        `SELECT ${SAFE} FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, (page - 1) * limit]
    );
    return rows;
};

// Change the name or the email. COALESCE keeps the old value when none is sent
export const updateUser = async (id, { full_name, email }) => {
    const { rows } = await db.query(
        `UPDATE users
         SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), updated_at = NOW()
         WHERE id = $3
         RETURNING ${SAFE}`,
        [full_name, email, id]
    );
    return rows[0];
};

// Enable or disable an account
export const setActive = async (id, active) => {
    const { rows } = await db.query(
        `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING ${SAFE}`,
        [active, id]
    );
    return rows[0];
};
