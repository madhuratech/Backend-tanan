import pool from "../config/db.js";
import fs from "fs";
import path from "path";

// CREATE
export const createMembershipBenefit = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF is required",
      });
    }

    const pdf = `/uploads/documents/${req.file.filename}`;

    const [result] = await pool.execute(
      `
      INSERT INTO membership_benefits
      (title, description, pdf)
      VALUES (?, ?, ?)
      `,
      [title.trim(), description.trim(), pdf]
    );

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM membership_benefits
      WHERE id = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Membership benefit added successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Create membership benefit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create membership benefit",
    });
  }
};

// GET ALL
export const getMembershipBenefits = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT *
      FROM membership_benefits
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get membership benefits error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch membership benefits",
    });
  }
};

// GET ONE
export const getMembershipBenefitById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT *
      FROM membership_benefits
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Membership benefit not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get membership benefit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch membership benefit",
    });
  }
};

// DELETE
export const deleteMembershipBenefit = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT pdf
      FROM membership_benefits
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Membership benefit not found",
      });
    }

    await pool.execute(
      `
      DELETE FROM membership_benefits
      WHERE id = ?
      `,
      [id]
    );

    // Delete physical PDF
    const pdf = rows[0].pdf;

    if (pdf) {
      const filePath = path.join(
        process.cwd(),
        pdf.replace(/^\/+/, "")
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: "Membership benefit deleted successfully",
    });
  } catch (error) {
    console.error("Delete membership benefit error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete membership benefit",
    });
  }
};


// UPDATE
export const updateMembershipBenefit = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    // Get existing record
    const [existingRows] = await pool.execute(
      `
      SELECT *
      FROM membership_benefits
      WHERE id = ?
      `,
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Membership benefit not found",
      });
    }

    const existingBenefit = existingRows[0];

    let pdfPath = existingBenefit.pdf;

    // If a new PDF was uploaded, replace the old PDF
    if (req.file) {
      pdfPath = `/uploads/documents/${req.file.filename}`;
    }

    const [result] = await pool.execute(
      `
      UPDATE membership_benefits
      SET
        title = ?,
        description = ?,
        pdf = ?
      WHERE id = ?
      `,
      [
        title.trim(),
        description.trim(),
        pdfPath,
        id,
      ]
    );

    // Delete old PDF only after database update succeeds
    if (req.file && existingBenefit.pdf) {
      const oldPdfPath = path.join(
        process.cwd(),
        existingBenefit.pdf.replace(/^\/+/, "")
      );

      if (
        fs.existsSync(oldPdfPath) &&
        oldPdfPath !== path.join(
          process.cwd(),
          pdfPath.replace(/^\/+/, "")
        )
      ) {
        fs.unlinkSync(oldPdfPath);
      }
    }

    const [updatedRows] = await pool.execute(
      `
      SELECT *
      FROM membership_benefits
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Membership benefit updated successfully",
      data: updatedRows[0],
    });
  } catch (error) {
    console.error(
      "Update membership benefit error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update membership benefit",
    });
  }
};