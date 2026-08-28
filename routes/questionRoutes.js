import express from "express";
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "../controllers/questionController.js";

const router = express.Router();

router.get("/", getQuestions);
router.post("/", createQuestion);
router.put("/reorder", reorderQuestions); 
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

export default router;