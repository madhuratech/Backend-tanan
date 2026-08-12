import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const uploadPath = "uploads/events";

// Create folder if it doesn't exist
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Store image in memory first
const storage = multer.memoryStorage();

const upload = multer({ storage });

export const compressEventImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        const fileName = `${Date.now()}.webp`;
        const outputPath = path.join(uploadPath, fileName);

        await sharp(req.file.buffer)
            .resize({
                width: 1600,
                withoutEnlargement: true,
            })
            .webp({
                quality: 80,
            })
            .toFile(outputPath);

        req.file.filename = fileName;
        req.file.path = outputPath;
        req.file.destination = uploadPath;
        req.file.mimetype = "image/webp";

        next();
    } catch (error) {
        next(error);
    }
};

export default upload;