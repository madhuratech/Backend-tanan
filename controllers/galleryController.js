import fs from "fs";
import path from "path";
import pool, { query } from "../config/db.js";

const BACKEND_URL = process.env.BACKEND_URL;

// =====================================================
// Image URL Helper
// =====================================================
const getImageUrl = (image) => {
    if (!image) return "";

    if (image.startsWith("http")) {
        return image;
    }

    return `${BACKEND_URL}${image}`;
};

// =====================================================
// Normalize Image Path
// =====================================================
const normalizeImagePath = (image) => {
    if (!image) return "";

    if (
        image.startsWith("http://") ||
        image.startsWith("https://")
    ) {
        try {
            return new URL(image).pathname;
        } catch (error) {
            return image;
        }
    }

    return image;
};

// =====================================================
// Get Physical File Path
// =====================================================
const getPhysicalFilePath = (image) => {
    if (!image) return null;

    const normalizedPath =
        normalizeImagePath(image);

    return path.resolve(
        process.cwd(),
        normalizedPath.startsWith("/")
            ? normalizedPath.slice(1)
            : normalizedPath
    );
};

// =====================================================
// Delete Physical Image
// =====================================================
const deletePhysicalImage = (image) => {
    if (!image) return;

    const imagePath =
        getPhysicalFilePath(image);

    if (!imagePath) return;

    console.log(
        "Checking image for deletion:",
        imagePath
    );

    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);

        console.log(
            "✅ Deleted image:",
            imagePath
        );
    }
};

// =====================================================
// CREATE GALLERY
// =====================================================
export const createGallery = async (
    req,
    res
) => {
    let conn;

    try {
        const title =
            req.body.title || "";

        const description =
            req.body.description || "";

        // =================================================
        // Read imageOrder sent from frontend
        // =================================================
        let imageOrder = [];

        if (req.body.imageOrder) {
            try {
                imageOrder =
                    JSON.parse(
                        req.body.imageOrder
                    );
            } catch (error) {
                console.error(
                    "Invalid imageOrder JSON:",
                    error
                );

                imageOrder = [];
            }
        }

        // =================================================
        // New image UIDs
        // =================================================
        let newImageUids = [];

        if (req.body.newImageUids) {
            try {
                newImageUids =
                    JSON.parse(
                        req.body.newImageUids
                    );
            } catch (error) {
                console.error(
                    "Invalid newImageUids JSON:",
                    error
                );

                newImageUids = [];
            }
        }

        // =================================================
        // Files uploaded by Multer
        // =================================================
        const uploadedFiles =
            req.files || [];

        // =================================================
        // Map frontend UID → uploaded file
        // =================================================
        const fileMap = new Map();

        uploadedFiles.forEach(
            (file, index) => {
                const uid =
                    newImageUids[index];

                if (uid) {
                    fileMap.set(
                        uid,
                        file
                    );
                }
            }
        );

        // =================================================
        // Build images in exact frontend order
        // =================================================
        let images = [];

        if (imageOrder.length > 0) {
            images = imageOrder
                .map(
                    (
                        item,
                        index
                    ) => {
                        if (
                            item.type ===
                            "new"
                        ) {
                            const file =
                                fileMap.get(
                                    item.uid
                                );

                            if (!file) {
                                return null;
                            }

                            return {
                                image: `/uploads/galleries/${file.filename}`,
                                imageTitle:
                                    item.imageTitle ||
                                    "",
                                position:
                                    index,
                            };
                        }

                        return null;
                    }
                )
                .filter(Boolean);
        } else {
            // =================================================
            // Backward compatibility
            // =================================================
            let imageTitles = [];

            if (
                req.body.imageTitles
            ) {
                try {
                    imageTitles =
                        JSON.parse(
                            req.body.imageTitles
                        );
                } catch (
                    error
                ) {
                    console.error(
                        "Invalid imageTitles JSON:",
                        error
                    );
                }
            }

            images =
                uploadedFiles.map(
                    (
                        file,
                        index
                    ) => ({
                        image: `/uploads/galleries/${file.filename}`,
                        imageTitle:
                            imageTitles[
                                index
                            ] || "",
                        position:
                            index,
                    })
                );
        }

        // =================================================
        // Validate uploaded images
        // =================================================
        if (
            uploadedFiles.length >
                0 &&
            images.length === 0
        ) {
            throw new Error(
                "Unable to process uploaded gallery images."
            );
        }

        // =================================================
        // Database transaction
        // =================================================
        conn =
            await pool.getConnection();

        await conn.beginTransaction();

        // =================================================
        // Insert Gallery
        // =================================================
        const [
            galleryResult,
        ] = await conn.execute(
            `
            INSERT INTO galleries
                (title, description)
            VALUES
                (?, ?)
            `,
            [
                title,
                description,
            ]
        );

        const galleryId =
            galleryResult.insertId;

        // =================================================
        // Insert Images With Position
        // =================================================
        for (
            let index = 0;
            index < images.length;
            index++
        ) {
            const img =
                images[index];

            await conn.execute(
                `
                INSERT INTO gallery_images
                    (
                        galleryId,
                        image,
                        imageTitle,
                        position
                    )
                VALUES
                    (?, ?, ?, ?)
                `,
                [
                    galleryId,
                    img.image,
                    img.imageTitle,
                    index,
                ]
            );
        }

        await conn.commit();

        // =================================================
        // Fetch Saved Images In Correct Order
        // =================================================
        const dbImgs =
            await query(
                `
                SELECT *
                FROM gallery_images
                WHERE galleryId = ?
                ORDER BY
                    position ASC,
                    id ASC
                `,
                [galleryId]
            );

        // =================================================
        // Response
        // =================================================
        const gallery = {
            _id:
                galleryId.toString(),

            id: galleryId,

            title,

            description,

            images:
                dbImgs.map(
                    (img) => ({
                        _id:
                            img.id.toString(),

                        id:
                            img.id,

                        image:
                            getImageUrl(
                                img.image
                            ),

                        imageTitle:
                            img.imageTitle,

                        position:
                            img.position,
                    })
                ),
        };

        return res
            .status(201)
            .json({
                success: true,
                data: gallery,
            });
    } catch (error) {
        console.error(
            "Create Gallery Error:",
            error
        );

        if (conn) {
            try {
                await conn.rollback();
            } catch (
                rollbackError
            ) {
                console.error(
                    "Rollback failed:",
                    rollbackError
                );
            }
        }

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message,
            });
    } finally {
        if (conn) {
            conn.release();
        }
    }
};

// =====================================================
// GET ALL GALLERIES
// =====================================================
export const getGalleries = async (
    req,
    res
) => {
    try {
        const galleries =
            await query(
                `
                SELECT *
                FROM galleries
                ORDER BY createdAt DESC
                `
            );

        const images =
            await query(
                `
                SELECT *
                FROM gallery_images
                ORDER BY
                    galleryId ASC,
                    position ASC,
                    id ASC
                `
            );

        const data =
            galleries.map(
                (g) => {
                    const galleryImages =
                        images
                            .filter(
                                (
                                    img
                                ) =>
                                    img.galleryId ===
                                    g.id
                            )
                            .sort(
                                (
                                    a,
                                    b
                                ) => {
                                    if (
                                        a.position ===
                                        b.position
                                    ) {
                                        return (
                                            a.id -
                                            b.id
                                        );
                                    }

                                    return (
                                        a.position -
                                        b.position
                                    );
                                }
                            )
                            .map(
                                (
                                    img
                                ) => ({
                                    _id:
                                        img.id.toString(),

                                    id:
                                        img.id,

                                    image:
                                        getImageUrl(
                                            img.image
                                        ),

                                    imageTitle:
                                        img.imageTitle,

                                    position:
                                        img.position,
                                })
                            );

                    return {
                        _id:
                            g.id.toString(),

                        id:
                            g.id,

                        title:
                            g.title,

                        description:
                            g.description,

                        images:
                            galleryImages,

                        createdAt:
                            g.createdAt,

                        updatedAt:
                            g.updatedAt,
                    };
                }
            );

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(
            "Get Galleries Error:",
            error
        );

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message,
            });
    }
};

// =====================================================
// GET SINGLE GALLERY
// =====================================================
export const getGallery = async (
    req,
    res
) => {
    try {
        const galleryId =
            req.params.id;

        const galleries =
            await query(
                `
                SELECT *
                FROM galleries
                WHERE id = ?
                `,
                [galleryId]
            );

        if (
            galleries.length ===
            0
        ) {
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Gallery not found",
                });
        }

        const g =
            galleries[0];

        // =================================================
        // IMPORTANT:
        // Fetch images using saved drag order
        // =================================================
        const dbImgs =
            await query(
                `
                SELECT *
                FROM gallery_images
                WHERE galleryId = ?
                ORDER BY
                    position ASC,
                    id ASC
                `,
                [galleryId]
            );

        const gallery = {
            _id:
                g.id.toString(),

            id: g.id,

            title:
                g.title,

            description:
                g.description,

            images:
                dbImgs.map(
                    (img) => ({
                        _id:
                            img.id.toString(),

                        id:
                            img.id,

                        image:
                            getImageUrl(
                                img.image
                            ),

                        imageTitle:
                            img.imageTitle,

                        position:
                            img.position,
                    })
                ),

            createdAt:
                g.createdAt,

            updatedAt:
                g.updatedAt,
        };

        return res.json({
            success: true,
            data: gallery,
        });
    } catch (error) {
        console.error(
            "Get Gallery Error:",
            error
        );

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message,
            });
    }
};

// =====================================================
// UPDATE GALLERY
// =====================================================
export const updateGallery = async (
    req,
    res
) => {
    let conn;

    try {
        const galleryId =
            req.params.id;

        const title =
            req.body.title || "";

        const description =
            req.body.description ||
            "";

        // =================================================
        // Check Gallery
        // =================================================
        const galleries =
            await query(
                `
                SELECT *
                FROM galleries
                WHERE id = ?
                `,
                [galleryId]
            );

        if (
            galleries.length ===
            0
        ) {
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Gallery not found",
                });
        }

        const g =
            galleries[0];

        // =================================================
        // Get Current Database Images
        // =================================================
        const dbImgs =
            await query(
                `
                SELECT *
                FROM gallery_images
                WHERE galleryId = ?
                ORDER BY
                    position ASC,
                    id ASC
                `,
                [galleryId]
            );

        // =================================================
        // Parse imageOrder
        // =================================================
        let imageOrder = [];

        if (req.body.imageOrder) {
            try {
                imageOrder =
                    JSON.parse(
                        req.body.imageOrder
                    );
            } catch (error) {
                console.error(
                    "Invalid imageOrder JSON:",
                    error
                );

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Invalid imageOrder data.",
                    });
            }
        }

        // =================================================
        // Parse existingImages
        // =================================================
        let existingImages = [];

        if (
            req.body.existingImages
        ) {
            try {
                existingImages =
                    JSON.parse(
                        req.body
                            .existingImages
                    );
            } catch (
                error
            ) {
                console.error(
                    "Invalid existingImages JSON:",
                    error
                );
            }
        }

        // =================================================
        // Parse newImageUids
        // =================================================
        let newImageUids = [];

        if (
            req.body.newImageUids
        ) {
            try {
                newImageUids =
                    JSON.parse(
                        req.body
                            .newImageUids
                    );
            } catch (
                error
            ) {
                console.error(
                    "Invalid newImageUids JSON:",
                    error
                );
            }
        }

        // =================================================
        // Uploaded Files
        // =================================================
        const uploadedFiles =
            req.files || [];

        // =================================================
        // Map new UID → uploaded file
        // =================================================
        const fileMap = new Map();

        uploadedFiles.forEach(
            (file, index) => {
                const uid =
                    newImageUids[index];

                if (uid) {
                    fileMap.set(
                        uid,
                        file
                    );
                }
            }
        );

        // =================================================
        // Build Existing Image Lookup
        // =================================================
        const existingImageMap =
            new Map();

        dbImgs.forEach(
            (img) => {
                existingImageMap.set(
                    img.image,
                    img
                );

                existingImageMap.set(
                    getImageUrl(
                        img.image
                    ),
                    img
                );
            }
        );

        // =================================================
        // Determine New Images To Keep
        // =================================================
        const retainedExistingPaths =
            new Set();

        imageOrder.forEach(
            (item) => {
                if (
                    item.type ===
                    "existing"
                ) {
                    const normalized =
                        normalizeImagePath(
                            item.image
                        );

                    retainedExistingPaths.add(
                        normalized
                    );
                }
            }
        );

        // =================================================
        // Delete Removed Existing Images
        // =================================================
        for (
            const oldImage of dbImgs
        ) {
            const oldPath =
                normalizeImagePath(
                    oldImage.image
                );

            if (
                !retainedExistingPaths.has(
                    oldPath
                )
            ) {
                deletePhysicalImage(
                    oldImage.image
                );
            }
        }

        // =================================================
        // Build Final Images
        // =================================================
        let finalImages = [];

        if (
            imageOrder.length > 0
        ) {
            finalImages =
                imageOrder
                    .map(
                        (
                            item,
                            index
                        ) => {
                            // =============================================
                            // Existing Image
                            // =============================================
                            if (
                                item.type ===
                                "existing"
                            ) {
                                const imagePath =
                                    normalizeImagePath(
                                        item.image
                                    );

                                const oldImage =
                                    existingImageMap.get(
                                        imagePath
                                    );

                                return {
                                    image:
                                        imagePath,

                                    imageTitle:
                                        item.imageTitle ||
                                        "",

                                    position:
                                        index,

                                    existing:
                                        true,

                                    oldId:
                                        oldImage?.id ||
                                        null,
                                };
                            }

                            // =============================================
                            // New Image
                            // =============================================
                            if (
                                item.type ===
                                "new"
                            ) {
                                const file =
                                    fileMap.get(
                                        item.uid
                                    );

                                if (!file) {
                                    console.error(
                                        `Uploaded file not found for UID: ${item.uid}`
                                    );

                                    return null;
                                }

                                return {
                                    image: `/uploads/galleries/${file.filename}`,

                                    imageTitle:
                                        item.imageTitle ||
                                        "",

                                    position:
                                        index,

                                    existing:
                                        false,

                                    oldId:
                                        null,
                                };
                            }

                            return null;
                        }
                    )
                    .filter(Boolean);
        } else {
            // =================================================
            // BACKWARD COMPATIBILITY
            // =================================================
            const imageTitles =
                req.body.imageTitles
                    ? JSON.parse(
                          req.body
                              .imageTitles
                      )
                    : [];

            const fallbackExisting =
                existingImages.map(
                    (
                        img,
                        index
                    ) => ({
                        image:
                            normalizeImagePath(
                                img.image
                            ),

                        imageTitle:
                            imageTitles[
                                index
                            ] || "",

                        position:
                            index,

                        existing:
                            true,

                        oldId:
                            img.id ||
                            null,
                    })
                );

            const fallbackNew =
                uploadedFiles.map(
                    (
                        file,
                        index
                    ) => ({
                        image: `/uploads/galleries/${file.filename}`,

                        imageTitle:
                            imageTitles[
                                fallbackExisting.length +
                                    index
                            ] || "",

                        position:
                            fallbackExisting.length +
                            index,

                        existing:
                            false,

                        oldId:
                            null,
                    })
                );

            finalImages = [
                ...fallbackExisting,
                ...fallbackNew,
            ];
        }

        // =================================================
        // Validate Final Images
        // =================================================
        if (
            imageOrder.length >
                0 &&
            finalImages.length !==
                imageOrder.length
        ) {
            throw new Error(
                "Some gallery images could not be processed."
            );
        }

        // =================================================
        // Database Transaction
        // =================================================
        conn =
            await pool.getConnection();

        await conn.beginTransaction();

        // =================================================
        // Update Gallery
        // =================================================
        await conn.execute(
            `
            UPDATE galleries
            SET
                title = ?,
                description = ?
            WHERE id = ?
            `,
            [
                title,
                description,
                galleryId,
            ]
        );

        // =================================================
        // Delete Existing Gallery Images
        // =================================================
        await conn.execute(
            `
            DELETE FROM gallery_images
            WHERE galleryId = ?
            `,
            [galleryId]
        );

        // =================================================
        // Insert Images In Exact Drag Order
        // =================================================
        for (
            let index = 0;
            index <
            finalImages.length;
            index++
        ) {
            const img =
                finalImages[index];

            await conn.execute(
                `
                INSERT INTO gallery_images
                    (
                        galleryId,
                        image,
                        imageTitle,
                        position
                    )
                VALUES
                    (?, ?, ?, ?)
                `,
                [
                    galleryId,

                    img.image,

                    img.imageTitle,

                    index,
                ]
            );
        }

        await conn.commit();

        // =================================================
        // Fetch Updated Images
        // =================================================
        const newDbImgs =
            await query(
                `
                SELECT *
                FROM gallery_images
                WHERE galleryId = ?
                ORDER BY
                    position ASC,
                    id ASC
                `,
                [galleryId]
            );

        // =================================================
        // Fetch Updated Gallery
        // =================================================
        const reFetch =
            await query(
                `
                SELECT *
                FROM galleries
                WHERE id = ?
                `,
                [galleryId]
            );

        const updatedData =
            reFetch.length > 0
                ? reFetch[0]
                : g;

        // =================================================
        // Response
        // =================================================
        const updatedGallery = {
            _id:
                updatedData.id.toString(),

            id:
                updatedData.id,

            title:
                updatedData.title,

            description:
                updatedData.description,

            images:
                newDbImgs.map(
                    (img) => ({
                        _id:
                            img.id.toString(),

                        id:
                            img.id,

                        image:
                            getImageUrl(
                                img.image
                            ),

                        imageTitle:
                            img.imageTitle,

                        position:
                            img.position,
                    })
                ),

            createdAt:
                updatedData.createdAt,

            updatedAt:
                updatedData.updatedAt,
        };

        return res.json({
            success: true,
            data: updatedGallery,
        });
    } catch (error) {
        console.error(
            "Update Gallery Error:",
            error
        );

        if (conn) {
            try {
                await conn.rollback();
            } catch (
                rollbackError
            ) {
                console.error(
                    "Rollback failed:",
                    rollbackError
                );
            }
        }

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message,
            });
    } finally {
        if (conn) {
            conn.release();
        }
    }
};

// =====================================================
// DELETE GALLERY
// =====================================================
export const deleteGallery = async (
    req,
    res
) => {
    try {
        const galleryId =
            req.params.id;

        const galleries =
            await query(
                `
                SELECT *
                FROM galleries
                WHERE id = ?
                `,
                [galleryId]
            );

        if (
            galleries.length ===
            0
        ) {
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Gallery not found",
                });
        }

        const dbImgs =
            await query(
                `
                SELECT *
                FROM gallery_images
                WHERE galleryId = ?
                `,
                [galleryId]
            );

        // =================================================
        // Delete Physical Images
        // =================================================
        for (
            const img of dbImgs
        ) {
            if (img.image) {
                deletePhysicalImage(
                    img.image
                );
            }
        }

        // =================================================
        // Delete Gallery
        // =================================================
        await query(
            `
            DELETE FROM galleries
            WHERE id = ?
            `,
            [galleryId]
        );

        return res.status(200).json({
            success: true,
            message:
                "Gallery deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete Gallery Error:",
            error
        );

        return res
            .status(500)
            .json({
                success: false,
                message:
                    error.message,
            });
    }
};