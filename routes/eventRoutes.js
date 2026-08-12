import express from "express";
import upload, {
    compressEventImage,
} from "../middleware/eventUpload.js";

import {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

router.get("/", getEvents);

router.get("/:id", getEventById);

router.post(
    "/",
    upload.single("image"),
    compressEventImage,
    createEvent
);

router.put(
    "/:id",
    upload.single("image"),
    compressEventImage,
    updateEvent
);

router.delete("/:id", deleteEvent);

export default router;