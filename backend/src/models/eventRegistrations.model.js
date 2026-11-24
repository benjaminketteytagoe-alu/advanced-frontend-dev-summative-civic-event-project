import db from '../config/db.js';

// Register someone. If they cancelled before, the old row is switched back on.
// Gives back nothing when they are already registered
export const register = async (user_id, event_id) => {
    const { rows } = await db.query(
        `INSERT INTO event_registrations (user_id, event_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, event_id)
         DO UPDATE SET status = 'registered', updated_at = NOW()
         WHERE event_registrations.status = 'cancelled'
         RETURNING *`,
        [user_id, event_id]
    );
    return rows[0];
};

// Cancel, but keep the row
export const cancelRegistration = async (user_id, event_id) => {
    const { rows } = await db.query(
        `UPDATE event_registrations
         SET status = 'cancelled', updated_at = NOW()
         WHERE user_id = $1 AND event_id = $2
         RETURNING *`,
        [user_id, event_id]
    );
    return rows[0];
};

// Everyone coming to an event, with their name and email
export const findByEvent = async (event_id) => {
    const { rows } = await db.query(
        `SELECT er.*, u.full_name, u.email
         FROM event_registrations er
         JOIN users u ON er.user_id = u.id
         WHERE er.event_id = $1 AND er.status = 'registered'`,
        [event_id]
    );
    return rows;
};

// Every registration one person has, cancelled ones too, with the event details
export const findByUser = async (user_id) => {
    const { rows } = await db.query(
        `SELECT er.*, e.title, e.starts_at, e.ends_at, e.location
         FROM event_registrations er
         JOIN events e ON er.event_id = e.id
         WHERE er.user_id = $1`,
        [user_id]
    );
    return rows;
};
