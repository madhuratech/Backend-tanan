import express from "express";

import {
  createBranch,
  deleteBranch,
  getBranch,
  getBranches,
  updateBranch,
  getBranchHeading,
  createBranchHeading,
  updateBranchHeading,
  deleteBranchHeading,
} from "../controllers/branchController.js";

const router = express.Router();



router.get("/heading", getBranchHeading);
router.post("/heading", createBranchHeading);
router.put("/heading/:id", updateBranchHeading);
router.delete("/heading/:id", deleteBranchHeading);

router.get("/", getBranches);
router.get("/:id", getBranch);
router.post("/", createBranch);
router.put("/:id", updateBranch);
router.delete("/:id", deleteBranch);

export default router;