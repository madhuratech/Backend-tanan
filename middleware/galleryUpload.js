import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const uploadDir = "uploads/galleries";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true,
    });
}

// Store files in memory first
const storage = multer.memoryStorage();

const upload = multer({ storage });

// Compress all uploaded gallery images to WebP
export const compressGalleryImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        const compressedFiles = [];

        for (const file of req.files) {
            const fileName = `${Date.now()}-${Math.round(
                Math.random() * 1e9
            )}.webp`;

            const outputPath = path.join(uploadDir, fileName);

            await sharp(file.buffer)
                .resize({
                    width: 1600,
                    withoutEnlargement: true,
                })
                .webp({
                    quality: 80,
                })
                .toFile(outputPath);

            compressedFiles.push({
                ...file,
                filename: fileName,
                path: outputPath,
                destination: uploadDir,
                mimetype: "image/webp",
            });
        }

        req.files = compressedFiles;

        next();
    } catch (error) {
        next(error);
    }
};

export default upload;