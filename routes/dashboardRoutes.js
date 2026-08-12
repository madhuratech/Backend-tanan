import express from "express";
import { getStorageDetails } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/storage", getStorageDetails);

export default router;