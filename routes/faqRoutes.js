import express from "express";
import {
  createFaq,
  deleteFaq,
  getFaq,
  getFaqs,
  updateFaq,
} from "../controllers/faqController.js";

const router = express.Router();

router.get("/", getFaqs);
router.get("/:id", getFaq);
router.post("/", createFaq);
router.put("/:id", updateFaq);
router.delete("/:id", deleteFaq);

export default router;
