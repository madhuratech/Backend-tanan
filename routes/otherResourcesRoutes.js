import express from "express";
import upload from "../middleware/OtherResourceUpload.js";
import {
  getOtherResources,
  createOtherResource,
  updateOtherResource,
  deleteOtherResource,
} from "../controllers/otherResourceController.js";

const router = express.Router();

router.get("/", getOtherResources);
router.post("/", upload.single("file"), createOtherResource);
router.put("/:id", upload.single("file"), updateOtherResource);
router.delete("/:id", deleteOtherResource);

export default router;