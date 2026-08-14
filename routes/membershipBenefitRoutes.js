import express from "express";

import {
  createMembershipBenefit,
  getMembershipBenefits,
  getMembershipBenefitById,
  deleteMembershipBenefit,
} from "../controllers/membershipBenefitController.js";

import DocumentUpload from "../middleware/DocumentUpload.js";

const router = express.Router();

router.post(
  "/",
  DocumentUpload.single("pdf"),
  createMembershipBenefit
);

router.get("/", getMembershipBenefits);

router.get("/:id", getMembershipBenefitById);

router.delete("/:id", deleteMembershipBenefit);

export default router;