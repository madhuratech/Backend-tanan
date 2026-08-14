import express from "express";

import {
  createMembershipBenefit,
  getMembershipBenefits,
  getMembershipBenefitById,
  updateMembershipBenefit,
  deleteMembershipBenefit,
} from "../controllers/membershipBenefitController.js";

import DocumentUpload from "../middleware/documentUpload.js";

const router = express.Router();

// =====================================================
// Create Membership Benefit
// POST /api/membership-benefits
// =====================================================
router.post(
  "/",
  DocumentUpload.single("pdf"),
  createMembershipBenefit
);

// =====================================================
// Get All Membership Benefits
// GET /api/membership-benefits
// =====================================================
router.get(
  "/",
  getMembershipBenefits
);

// =====================================================
// Get Membership Benefit By ID
// GET /api/membership-benefits/:id
// =====================================================
router.get(
  "/:id",
  getMembershipBenefitById
);

// =====================================================
// Update Membership Benefit
// PUT /api/membership-benefits/:id
// =====================================================
router.put(
  "/:id",
  DocumentUpload.single("pdf"),
  updateMembershipBenefit
);

// =====================================================
// Delete Membership Benefit
// DELETE /api/membership-benefits/:id
// =====================================================
router.delete(
  "/:id",
  deleteMembershipBenefit
);

export default router;