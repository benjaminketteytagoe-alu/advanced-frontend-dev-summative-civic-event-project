import db from '../config/db.js';

// Every event, drafts included (for admins)
export const findAll = async () => {
    const { rows } = await db.query('SELECT * FROM events ORDER BY starts_at ASC');
    return rows;
};

// Published events only (for normal users)
export const findPublished = async () => {
    const { rows } = await db.query('SELECT * FROM events WHERE published = true ORDER BY starts_at ASC');
    return rows;
};

// One event
export const findById = async (id) => {
    const { rows } = await db.query('SELECT * FROM events WHERE id = $1', [id]);
    return rows[0];
};

// Save a new event, published unless told otherwise
export const create = async ({ title, description, location, starts_at, ends_at, metadata, published = true }) => {
    const { rows } = await db.query(
        `INSERT INTO events (title, description, location, starts_at, ends_at, metadata, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, description, location, starts_at, ends_at, metadata, published]
    );
    return rows[0];
};

// Change an event. COALESCE keeps the old published value when none is sent
export const update = async (id, { title, description, location, starts_at, ends_at, metadata, published }) => {
    const { rows } = await db.query(
        `UPDATE events
         SET title = $1,
             description = $2,
             location = $3,
             starts_at = $4,
             ends_at = $5,
             metadata = $6,
             published = COALESCE($7, published),
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [title, description, location, starts_at, ends_at, metadata, published, id]
    );
    return rows[0];
};

// Delete an event
export const remove = async (id) => {
    await db.query('DELETE FROM events WHERE id = $1', [id]);
};
