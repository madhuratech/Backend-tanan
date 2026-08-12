import fs from "fs";
import path from "path";
import pool, { query } from "../config/db.js";

// Create Gallery
export const createGallery = async (req, res) => {
    try {
        const title = req.body.title;
        const description = req.body.description;

        const imageTitles = req.body.imageTitles
            ? JSON.parse(req.body.imageTitles)
            : [];

        const images = req.files?.map((file, index) => ({
            image: `/uploads/galleries/${file.filename}`,
            imageTitle: imageTitles[index] || "",
        })) || [];

        const conn = await pool.getConnection();
        let galleryId;
        try {
            await conn.beginTransaction();

            const [galleryResult] = await conn.execute(
                "INSERT INTO galleries (title, description) VALUES (?, ?)",
                [title, description]
            );
            galleryId = galleryResult.insertId;

            for (const img of images) {
                await conn.execute(
                    "INSERT INTO gallery_images (galleryId, image, imageTitle) VALUES (?, ?, ?)",
                    [galleryId, img.image, img.imageTitle]
                );
            }

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        const dbImgs = await query(
            "SELECT * FROM gallery_images WHERE galleryId = ?",
            [galleryId]
        );

        const gallery = {
            _id: galleryId.toString(),
            id: galleryId,
            title,
            description,
            images: dbImgs.map((img) => ({
                _id: img.id.toString(),
                id: img.id,
                image: img.image,
                imageTitle: img.imageTitle,
            })),
        };

        res.status(201).json({
            success: true,
            data: gallery,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get All Galleries
export const getGalleries = async (req, res) => {
    try {
        const galleries = await query(
            "SELECT * FROM galleries ORDER BY createdAt DESC"
        );
        const images = await query("SELECT * FROM gallery_images");

        const data = galleries.map((g) => {
            const galleryImages = images
                .filter((img) => img.galleryId === g.id)
                .map((img) => ({
                    _id: img.id.toString(),
                    id: img.id,
                    image: img.image,
                    imageTitle: img.imageTitle,
                }));
            return {
                _id: g.id.toString(),
                id: g.id,
                title: g.title,
                description: g.description,
                images: galleryImages,
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
            };
        });

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get Single Gallery
export const getGallery = async (req, res) => {
    try {
        const galleryId = req.params.id;
        const galleries = await query(
            "SELECT * FROM galleries WHERE id = ?",
            [galleryId]
        );

        if (galleries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        const g = galleries[0];
        const dbImgs = await query(
            "SELECT * FROM gallery_images WHERE galleryId = ?",
            [galleryId]
        );

        const gallery = {
            _id: g.id.toString(),
            id: g.id,
            title: g.title,
            description: g.description,
            images: dbImgs.map((img) => ({
                _id: img.id.toString(),
                id: img.id,
                image: img.image,
                imageTitle: img.imageTitle,
            })),
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
        };

        res.json({
            success: true,
            data: gallery,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update Gallery
export const updateGallery = async (req, res) => {
    try {
        const galleryId = req.params.id;
        const title = req.body.title;
        const description = req.body.description;

        const galleries = await query(
            "SELECT * FROM galleries WHERE id = ?",
            [galleryId]
        );
        if (galleries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }
        const g = galleries[0];

        const dbImgs = await query(
            "SELECT * FROM gallery_images WHERE galleryId = ?",
            [galleryId]
        );

        const existingImages = req.body.existingImages
            ? JSON.parse(req.body.existingImages)
            : [];

        const imageTitles = req.body.imageTitles
            ? JSON.parse(req.body.imageTitles)
            : [];

        const removedImages = dbImgs.filter(
            (oldImage) =>
                !existingImages.some(
                    (existingImage) =>
                        existingImage.image === oldImage.image
                )
        );

        removedImages.forEach((img) => {
            const imagePath = path.resolve(
                process.cwd(),
                img.image.startsWith("/")
                    ? img.image.slice(1)
                    : img.image
            );

            console.log("Deleting:", imagePath);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });

        const updatedExistingImages = existingImages.map(
            (img, index) => ({
                image: img.image,
                imageTitle: imageTitles[index] || "",
            })
        );

        const existingCount = updatedExistingImages.length;

        const newImages =
            req.files?.map((file, index) => ({
                image: `/uploads/galleries/${file.filename}`,
                imageTitle:
                    imageTitles[existingCount + index] || "",
            })) || [];

        const mergedImages = [
            ...updatedExistingImages,
            ...newImages,
        ];

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            await conn.execute(
                "UPDATE galleries SET title = ?, description = ? WHERE id = ?",
                [title, description, galleryId]
            );

            await conn.execute(
                "DELETE FROM gallery_images WHERE galleryId = ?",
                [galleryId]
            );

            for (const img of mergedImages) {
                await conn.execute(
                    "INSERT INTO gallery_images (galleryId, image, imageTitle) VALUES (?, ?, ?)",
                    [galleryId, img.image, img.imageTitle]
                );
            }

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        const newDbImgs = await query(
            "SELECT * FROM gallery_images WHERE galleryId = ?",
            [galleryId]
        );
        const updatedGallery = {
            _id: g.id.toString(),
            id: g.id,
            title,
            description,
            images: newDbImgs.map((img) => ({
                _id: img.id.toString(),
                id: img.id,
                image: img.image,
                imageTitle: img.imageTitle,
            })),
            createdAt: g.createdAt,
        };

        const reFetch = await query(
            "SELECT * FROM galleries WHERE id = ?",
            [galleryId]
        );
        if (reFetch.length > 0) {
            updatedGallery.updatedAt = reFetch[0].updatedAt;
            updatedGallery.createdAt = reFetch[0].createdAt;
        }

        res.json({
            success: true,
            data: updatedGallery,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete Gallery
export const deleteGallery = async (req, res) => {
    try {
        const galleryId = req.params.id;
        const galleries = await query(
            "SELECT * FROM galleries WHERE id = ?",
            [galleryId]
        );

        if (galleries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        const dbImgs = await query(
            "SELECT * FROM gallery_images WHERE galleryId = ?",
            [galleryId]
        );

        for (const img of dbImgs) {
            if (img.image) {
                const filePath = path.join(
                    process.cwd(),
                    img.image.replace(/^\//, "")
                );

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }

        await query("DELETE FROM galleries WHERE id = ?", [galleryId]);

        res.status(200).json({
            success: true,
            message: "Gallery deleted successfully",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};