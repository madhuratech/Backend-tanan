import fs from "fs";
import path from "path";
import { query } from "../config/db.js";

const formatBranch = (row) => ({
  id: row.id,
  name: row.name,
  number: row.number,
  email: row.email,
  documentCount: Number(row.documentCount || 0),
  faqCount: Number(row.faqCount || 0),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const getBranches = async (req, res) => {
  try {
    const branches = await query(
      `
        SELECT
          b.id,
          b.name,
          b.number,
          b.email,
          b.created_at AS createdAt,
          b.updated_at AS updatedAt,
          (
            SELECT COUNT(*)
            FROM documents d
            WHERE d.scope = 'regional'
              AND d.branch_id = b.id
          ) AS documentCount,
          (
            SELECT COUNT(*)
            FROM faqs f
            WHERE f.scope = 'regional'
              AND f.branch_id = b.id
          ) AS faqCount
        FROM regional_branches b
        ORDER BY b.created_at DESC, b.id DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: branches.map(formatBranch),
    });
  } catch (error) {
    console.error("Get Branches Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBranch = async (req, res) => {
  try {
    const branchId = Number(req.params.id);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch id.",
      });
    }

    const branches = await query(
      `
        SELECT
          b.id,
          b.name,
          b.number,
          b.email,
          b.created_at AS createdAt,
          b.updated_at AS updatedAt,
          (
            SELECT COUNT(*)
            FROM documents d
            WHERE d.scope = 'regional'
              AND d.branch_id = b.id
          ) AS documentCount,
          (
            SELECT COUNT(*)
            FROM faqs f
            WHERE f.scope = 'regional'
              AND f.branch_id = b.id
          ) AS faqCount
        FROM regional_branches b
        WHERE b.id = ?
      `,
      [branchId]
    );

    if (branches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatBranch(branches[0]),
    });
  } catch (error) {
    console.error("Get Branch Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { name, number, email } = req.body;

    const trimmedName = name?.trim();
    const trimmedNumber = number?.trim();
    const trimmedEmail = email?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required.",
      });
    }

    if (!trimmedNumber) {
      return res.status(400).json({
        success: false,
        message: "Branch number is required.",
      });
    }

    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Branch email is required.",
      });
    }

    const result = await query(
      `
        INSERT INTO regional_branches (
          name,
          number,
          email
        )
        VALUES (?, ?, ?)
      `,
      [
        trimmedName,
        trimmedNumber,
        trimmedEmail,
      ]
    );

    const branches = await query(
      `
        SELECT
          id,
          name,
          number,
          email,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM regional_branches
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Branch created successfully.",
      data: formatBranch({
        ...branches[0],
        documentCount: 0,
        faqCount: 0,
      }),
    });
  } catch (error) {
    console.error("Create Branch Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const branchId = Number(req.params.id);
    const { name, number, email } = req.body;

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch id.",
      });
    }

    const trimmedName = name?.trim();
    const trimmedNumber = number?.trim();
    const trimmedEmail = email?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required.",
      });
    }

    if (!trimmedNumber) {
      return res.status(400).json({
        success: false,
        message: "Branch number is required.",
      });
    }

    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Branch email is required.",
      });
    }

    const existingBranches = await query(
      `
        SELECT id
        FROM regional_branches
        WHERE id = ?
      `,
      [branchId]
    );

    if (existingBranches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    await query(
      `
        UPDATE regional_branches
        SET
          name = ?,
          number = ?,
          email = ?
        WHERE id = ?
      `,
      [
        trimmedName,
        trimmedNumber,
        trimmedEmail,
        branchId,
      ]
    );

    const branches = await query(
      `
        SELECT
          b.id,
          b.name,
          b.number,
          b.email,
          b.created_at AS createdAt,
          b.updated_at AS updatedAt,
          (
            SELECT COUNT(*)
            FROM documents d
            WHERE d.scope = 'regional'
              AND d.branch_id = b.id
          ) AS documentCount,
          (
            SELECT COUNT(*)
            FROM faqs f
            WHERE f.scope = 'regional'
              AND f.branch_id = b.id
          ) AS faqCount
        FROM regional_branches b
        WHERE b.id = ?
      `,
      [branchId]
    );

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully.",
      data: formatBranch(branches[0]),
    });
  } catch (error) {
    console.error("Update Branch Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const branchId = Number(req.params.id);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch id.",
      });
    }

    const existingBranches = await query(
      `
        SELECT id
        FROM regional_branches
        WHERE id = ?
      `,
      [branchId]
    );

    if (existingBranches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    const branchDocuments = await query(
      `
        SELECT pdf
        FROM documents
        WHERE scope = 'regional'
          AND branch_id = ?
      `,
      [branchId]
    );

    await query(
      `DELETE FROM regional_branches WHERE id = ?`,
      [branchId]
    );

    branchDocuments.forEach((document) => {
      if (document.pdf) {
        const relativePath = document.pdf.replace(/^[/\\]+/, "");
        const fullPath = path.join(process.cwd(), relativePath);

        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Branch Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================================================
// BRANCH HEADING
// ======================================================

/* GET SECTION CONTENT */

export const getBranchHeading = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        id,
        heading,
        number,
        email,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM branch_heading
      ORDER BY id DESC
      LIMIT 1
    `);

    return res.status(200).json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) {
    console.error("Get Branch Heading Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* CREATE SECTION CONTENT */

export const createBranchHeading = async (req, res) => {
  try {
    const { heading, number, email } = req.body;

    const trimmedHeading = heading?.trim();
    const trimmedNumber = number?.trim();
    const trimmedEmail = email?.trim();

    if (!trimmedHeading) {
      return res.status(400).json({
        success: false,
        message: "Heading is required.",
      });
    }

    if (!trimmedNumber) {
      return res.status(400).json({
        success: false,
        message: "Number is required.",
      });
    }

    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Only one heading content is required
    const existing = await query(`
      SELECT id
      FROM branch_heading
      LIMIT 1
    `);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Section content already exists.",
      });
    }

    const result = await query(
      `
        INSERT INTO branch_heading (
          heading,
          number,
          email
        )
        VALUES (?, ?, ?)
      `,
      [
        trimmedHeading,
        trimmedNumber,
        trimmedEmail,
      ]
    );

    const rows = await query(
      `
        SELECT
          id,
          heading,
          number,
          email,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM branch_heading
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Section content created successfully.",
      data: rows[0],
    });
  } catch (error) {
    console.error("Create Branch Heading Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* UPDATE SECTION CONTENT */

export const updateBranchHeading = async (req, res) => {
  try {
    const headingId = Number(req.params.id);

    const { heading, number, email } = req.body;

    if (!Number.isInteger(headingId) || headingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid heading id.",
      });
    }

    const trimmedHeading = heading?.trim();
    const trimmedNumber = number?.trim();
    const trimmedEmail = email?.trim();

    if (!trimmedHeading) {
      return res.status(400).json({
        success: false,
        message: "Heading is required.",
      });
    }

    if (!trimmedNumber) {
      return res.status(400).json({
        success: false,
        message: "Number is required.",
      });
    }

    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const existing = await query(
      `
        SELECT id
        FROM branch_heading
        WHERE id = ?
      `,
      [headingId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Section content not found.",
      });
    }

    await query(
      `
        UPDATE branch_heading
        SET
          heading = ?,
          number = ?,
          email = ?
        WHERE id = ?
      `,
      [
        trimmedHeading,
        trimmedNumber,
        trimmedEmail,
        headingId,
      ]
    );

    const rows = await query(
      `
        SELECT
          id,
          heading,
          number,
          email,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM branch_heading
        WHERE id = ?
      `,
      [headingId]
    );

    return res.status(200).json({
      success: true,
      message: "Section content updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    console.error("Update Branch Heading Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* DELETE SECTION CONTENT */

export const deleteBranchHeading = async (req, res) => {
  try {
    const headingId = Number(req.params.id);

    if (!Number.isInteger(headingId) || headingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid heading id.",
      });
    }

    const existing = await query(
      `
        SELECT id
        FROM branch_heading
        WHERE id = ?
      `,
      [headingId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Section content not found.",
      });
    }

    await query(
      `
        DELETE FROM branch_heading
        WHERE id = ?
      `,
      [headingId]
    );

    return res.status(200).json({
      success: true,
      message: "Section content deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Branch Heading Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

