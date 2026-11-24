import db from '../config/db.js';

// One page of announcements, newest first. publishedOnly leaves drafts out, for normal users
export const findAll = async ({ page, limit, publishedOnly }) => {
    const where = publishedOnly ? 'WHERE published = true' : '';
    const { rows } = await db.query(
        `SELECT * FROM announcements ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, (page - 1) * limit]
    );
    return rows;
};

// One announcement
export const findById = async (id) => {
    const { rows } = await db.query('SELECT * FROM announcements WHERE id = $1', [id]);
    return rows[0];
};

// Save a new announcement, published unless told otherwise
export const create = async ({ title, audio_url, published = true }) => {
    const { rows } = await db.query(
        'INSERT INTO announcements (title, audio_url, published) VALUES ($1, $2, $3) RETURNING *',
        [title, audio_url, published]
    );
    return rows[0];
};

// Change an announcement
export const update = async (id, { title, audio_url, published }) => {
    const { rows } = await db.query(
        `UPDATE announcements
         SET title = $1, audio_url = $2, published = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [title, audio_url, published, id]
    );
    return rows[0];
};

// Publish or unpublish
export const setPublished = async (id, published) => {
    const { rows } = await db.query(
        'UPDATE announcements SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [published, id]
    );
    return rows[0];
};

// Delete an announcement
export const remove = async (id) => {
    await db.query('DELETE FROM announcements WHERE id = $1', [id]);
};
