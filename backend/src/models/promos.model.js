import db from '../config/db.js';

// One page of promos, newest first. publishedOnly leaves drafts out, for normal users
export const findAll = async ({ page, limit, publishedOnly }) => {
    const where = publishedOnly ? 'WHERE published = true' : '';

    const { rows } = await db.query(
        `SELECT * FROM promos ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, (page - 1) * limit]
    );
    const count = await db.query(`SELECT COUNT(*) FROM promos ${where}`);
    const total = Number(count.rows[0].count);

    return { promos: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

// One promo
export const findById = async (id) => {
    const { rows } = await db.query('SELECT * FROM promos WHERE id = $1', [id]);
    return rows[0];
};

// Save a new promo, published unless told otherwise
export const create = async ({ title, description, video_url, caption_text, created_by, published = true }) => {
    const { rows } = await db.query(
        `INSERT INTO promos (title, description, video_url, caption_text, created_by, published)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description, video_url, caption_text, created_by, published]
    );
    return rows[0];
};

// Change a promo
export const update = async (id, { title, description, video_url, caption_text, published }) => {
    const { rows } = await db.query(
        `UPDATE promos
         SET title = $1, description = $2, video_url = $3, caption_text = $4, published = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [title, description, video_url, caption_text, published, id]
    );
    return rows[0];
};

// Publish or unpublish
export const setPublished = async (id, published) => {
    const { rows } = await db.query(
        'UPDATE promos SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [published, id]
    );
    return rows[0];
};

// Delete a promo
export const remove = async (id) => {
    await db.query('DELETE FROM promos WHERE id = $1', [id]);
};
