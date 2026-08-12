import express from "express";

import {
    getTheme,
    updateTheme,
    themeHeartbeat,
} from "../controllers/themeController.js";

const router =
    express.Router();

// GET

router.get(
    "/",
    getTheme
);
// HEARTBEAT
router.get("/heartbeat", themeHeartbeat);
// UPDATE

router.put(
    "/update",
    updateTheme
);

export default router;