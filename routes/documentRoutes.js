import express from "express";
import {
  createDocument,
  deleteDocument,
  getDocument,
  getDocuments,
  updateDocument,
} from "../controllers/documentController.js";
import upload from "../middleware/documentUpload.js";

const router = express.Router();

router.post("/", upload.single("pdf"), createDocument);
router.get("/", getDocuments);
router.get("/:id", getDocument);
router.put("/:id", upload.single("pdf"), updateDocument);
router.delete("/:id", deleteDocument);

export default router;