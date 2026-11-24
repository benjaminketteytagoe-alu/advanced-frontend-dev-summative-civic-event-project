import db from '../config/db.js';

// Save a new request. Its status starts as open
export const create = async ({ user_id, type, location, description }) => {
    const { rows } = await db.query(
        `INSERT INTO service_requests (user_id, type, location, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, type, location, description]
    );
    return rows[0];
};

// One person's requests, newest first
export const findByUser = async (user_id) => {
    const { rows } = await db.query(
        'SELECT * FROM service_requests WHERE user_id = $1 ORDER BY created_at DESC',
        [user_id]
    );
    return rows;
};

// Everyone's requests, with the name of who sent each one
export const findAll = async () => {
    const { rows } = await db.query(
        `SELECT sr.*, u.full_name, u.email
         FROM service_requests sr
         JOIN users u ON sr.user_id = u.id
         ORDER BY sr.created_at DESC`
    );
    return rows;
};

// Change the status and the reply
export const update = async (id, { status, reply }) => {
    const { rows } = await db.query(
        `UPDATE service_requests
         SET status = $1, reply = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, reply, id]
    );
    return rows[0];
};
