// Every error in the API ends up here, so they all get the same kind of reply.
// It must be the last middleware in app.js

// Works out the status and message for an error. The codes come from PostgreSQL
function explain(err) {
    if (err.code === '23505') return { status: 409, message: 'Duplicate entry' };
    if (err.code === '23503') return { status: 409, message: 'This is linked to something else' };

    // An id that is not a real id cannot belong to anything
    if (err.code === '22P02' && err.message.includes('uuid')) return { status: 404, message: 'Not found' };

    // Wrong kind of value, bad date, date out of range, text too long
    if (['22P02', '22007', '22008', '22001'].includes(err.code)) return { status: 400, message: 'One of the values is not valid' };

    // Upload problems, such as a file that is too big
    if (err.code === 'LIMIT_FILE_SIZE') return { status: 400, message: 'That file is too large' };
    if (err.name === 'MulterError') return { status: 400, message: err.message };

    // Errors that already say what they are, such as broken JSON
    if (err.status >= 400 && err.status < 500) return { status: err.status, message: err.message };

    // Anything else is our fault, and the details stay in our own log
    return { status: 500, message: 'Internal Server Error' };
}

// Express knows this handles errors because it takes four arguments
const errorHandler = (err, req, res, next) => {
    const { status, message } = explain(err);
    if (status === 500) console.error(err);
    return res.status(status).json({ status, message });
};

export default errorHandler;
