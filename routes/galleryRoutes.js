import express from "express";
import galleryUpload, {
    compressGalleryImages,
} from "../middleware/galleryUpload.js";

import {
    createGallery,
    getGalleries,
    getGallery,
    updateGallery,
    deleteGallery,
} from "../controllers/galleryController.js";

const router = express.Router();

router.post(
    "/",
    galleryUpload.array("images", 500),
    compressGalleryImages,
    createGallery
);

router.get("/", getGalleries);

router.get("/:id", getGallery);

router.put(
    "/:id",
    galleryUpload.array("images", 500),
    compressGalleryImages,
    updateGallery
);

router.delete("/:id", deleteGallery);

export default router;