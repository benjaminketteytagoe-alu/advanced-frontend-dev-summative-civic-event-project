import multer from 'multer';
import path from 'path';
import fs from 'fs';

// An error the person can fix, so it gets 400
function badFile(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

// Keep files in uploads/<folder>, under a new name so two can never clash
function storeIn(folder) {
    return multer.diskStorage({
        destination: (req, file, done) => {
            const place = `uploads/${folder}`;
            fs.mkdirSync(place, { recursive: true }); // made the first time
            done(null, place);
        },
        filename: (req, file, done) => {
            const random = Math.round(Math.random() * 1e9);
            done(null, Date.now() + '-' + random + path.extname(file.originalname));
        }
    });
}

// Accept only these endings
function only(kind, endings) {
    return (req, file, done) => {
        const ending = path.extname(file.originalname).toLowerCase().slice(1);
        if (endings.includes(ending)) return done(null, true);
        done(badFile(`Only ${kind} files are allowed (${endings.join(', ')})`));
    };
}

function megabytes(n) {
    return { fileSize: n * 1024 * 1024 };
}

export const uploadEventImage = multer({
    storage: storeIn('events'),
    fileFilter: only('image', ['jpg', 'jpeg', 'png', 'gif']),
    limits: megabytes(2)
});

export const uploadPromoVideo = multer({
    storage: storeIn('promos'),
    fileFilter: only('video', ['mp4', 'mov', 'avi', 'mkv']),
    limits: megabytes(8)
});

export const uploadAudio = multer({
    storage: storeIn('announcements'),
    fileFilter: only('audio', ['mp3', 'wav', 'm4a', 'ogg']),
    limits: megabytes(5)
});
