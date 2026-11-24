import fs from 'fs';
import path from 'path';

// The web address of the file that was just uploaded
export const fileUrl = (req, folder) => {
    return `${req.protocol}://${req.get('host')}/uploads/${folder}/${req.file.filename}`;
};

// Delete one of our uploaded files. Links to other sites, such as YouTube, are left alone.
// basename keeps only the file name, so this can never reach another folder
export const deleteFile = (url, folder) => {
    if (!url || !url.includes(`/uploads/${folder}/`)) return;
    const file = path.join(process.cwd(), 'uploads', folder, path.basename(url));
    fs.rm(file, { force: true }, (err) => { if (err) console.error(err); });
};

// When a request is refused, throw away the file that came with it
export const dropRefusedFile = (req, res, next) => {
    res.on('finish', () => {
        const refused = res.statusCode >= 400 && res.statusCode < 500;
        if (refused && req.file) fs.rm(req.file.path, { force: true }, (err) => { if (err) console.error(err); });
    });
    next();
};
