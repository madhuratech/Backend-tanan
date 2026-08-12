import fs from "fs";
import path from "path";
import { query } from "../config/db.js";

const deleteFile = (filePath) => {
  try {
    if (!filePath) return;

    const relativePath = filePath.replace(/^[/\\]+/, "");
    const fullPath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error("Delete File Error:", error);
  }
};
const validateScopeAndBranch = async (scope, branchId) => {
  if (!["organization", "regional", "user_guide"].includes(scope)) {
    throw new Error("Invalid scope.");
  }

  // Organization and User Guide don't require a branch
  if (scope === "organization" || scope === "user_guide") {
    return {
      scope,
      branchId: null,
    };
  }

  // Regional requires a branch
  if (
    !branchId ||
    !Number.isInteger(Number(branchId)) ||
    Number(branchId) <= 0
  ) {
    throw new Error(
      "A valid branchId is required for regional content."
    );
  }

  const branches = await query(
    `SELECT id FROM regional_branches WHERE id = ?`,
    [Number(branchId)]
  );

  if (branches.length === 0) {
    throw new Error("Branch not found.");
  }

  return {
    scope,
    branchId: Number(branchId),
  };
};
const formatDocument = (row) => ({
  id: row.id,
  title: row.title,
  pdf: row.pdf,
  scope: row.scope,
  branchId: row.branchId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const getDocuments = async (req, res) => {
  try {
    const { scope = "organization", branchId } = req.query;
    const resolved = await validateScopeAndBranch(scope, branchId ?? null);

    let sql = `
      SELECT
        id,
        title,
        pdf,
        scope,
        branch_id AS branchId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM documents
      WHERE scope = ?
    `;
    const params = [resolved.scope];

    if (resolved.scope === "regional") {
      sql += ` AND branch_id = ?`;
      params.push(resolved.branchId);
    }

    sql += ` ORDER BY created_at DESC, id DESC`;

    const rows = await query(sql, params);

    return res.status(200).json({
      success: true,
      data: rows.map(formatDocument),
    });
  } catch (error) {
    console.error("Get Documents Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document id.",
      });
    }

    const rows = await query(
      `
        SELECT
          id,
          title,
          pdf,
          scope,
          branch_id AS branchId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM documents
        WHERE id = ?
      `,
      [documentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatDocument(rows[0]),
    });
  } catch (error) {
    console.error("Get Document Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { title, scope = "organization", branchId } = req.body;
    const trimmedTitle = title?.trim();

    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: "Document name is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file.",
      });
    }

    const resolved = await validateScopeAndBranch(scope, branchId ?? null);
    const pdfPath = `/uploads/documents/${req.file.filename}`;

    const result = await query(
      `
        INSERT INTO documents (title, pdf, scope, branch_id)
        VALUES (?, ?, ?, ?)
      `,
      [trimmedTitle, pdfPath, resolved.scope, resolved.branchId]
    );

    const rows = await query(
      `
        SELECT
          id,
          title,
          pdf,
          scope,
          branch_id AS branchId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM documents
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Document created successfully.",
      data: formatDocument(rows[0]),
    });
  } catch (error) {
    if (req.file) {
      deleteFile(`/uploads/documents/${req.file.filename}`);
    }

    console.error("Create Document Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const { title, scope = "organization", branchId } = req.body;

    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document id.",
      });
    }

    const existingRows = await query(`SELECT id, title, pdf, scope, branch_id AS branchId FROM documents WHERE id = ?`, [documentId]);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const existing = existingRows[0];
    const trimmedTitle = title?.trim();

    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: "Document name is required.",
      });
    }

    const resolved = await validateScopeAndBranch(scope, branchId ?? null);
    let newPdf = existing.pdf;

    if (req.file) {
      newPdf = `/uploads/documents/${req.file.filename}`;
    }

    await query(
      `
        UPDATE documents
        SET title = ?, pdf = ?, scope = ?, branch_id = ?
        WHERE id = ?
      `,
      [trimmedTitle, newPdf, resolved.scope, resolved.branchId, documentId]
    );

    if (req.file && existing.pdf && existing.pdf !== newPdf) {
      deleteFile(existing.pdf);
    }

    const rows = await query(
      `
        SELECT
          id,
          title,
          pdf,
          scope,
          branch_id AS branchId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM documents
        WHERE id = ?
      `,
      [documentId]
    );

    return res.status(200).json({
      success: true,
      message: "Document updated successfully.",
      data: formatDocument(rows[0]),
    });
  } catch (error) {
    console.error("Update Document Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document id.",
      });
    }

    const existingRows = await query(`SELECT id, pdf FROM documents WHERE id = ?`, [documentId]);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const existing = existingRows[0];

    await query(`DELETE FROM documents WHERE id = ?`, [documentId]);

    if (existing.pdf) {
      deleteFile(existing.pdf);
    }

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Document Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};