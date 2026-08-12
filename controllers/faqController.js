import { query } from "../config/db.js";

const validateScopeAndBranch = async (scope, branchId) => {
  if (!["organization", "regional"].includes(scope)) {
    throw new Error("Invalid scope.");
  }

  if (scope === "organization") {
    return { scope, branchId: null };
  }

  if (!branchId || !Number.isInteger(Number(branchId)) || Number(branchId) <= 0) {
    throw new Error("A valid branchId is required for regional content.");
  }

  const branches = await query(
    `SELECT id FROM regional_branches WHERE id = ?`,
    [Number(branchId)]
  );

  if (branches.length === 0) {
    throw new Error("Branch not found.");
  }

  return { scope, branchId: Number(branchId) };
};

const formatFaq = (row) => ({
  id: row.id,
  title: row.title,
  answer: row.answer,
  scope: row.scope,
  branchId: row.branchId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const getFaqs = async (req, res) => {
  try {
    const { scope, branchId } = req.query;

    const resolved = await validateScopeAndBranch(scope || "organization", branchId || null);

    let sql = `
      SELECT
        id,
        title,
        answer,
        scope,
        branch_id AS branchId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM faqs
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
      data: rows.map(formatFaq),
    });
  } catch (error) {
    console.error("Get FAQs Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFaq = async (req, res) => {
  try {
    const faqId = Number(req.params.id);

    if (!Number.isInteger(faqId) || faqId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ id.",
      });
    }

    const rows = await query(
      `
        SELECT
          id,
          title,
          answer,
          scope,
          branch_id AS branchId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM faqs
        WHERE id = ?
      `,
      [faqId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatFaq(rows[0]),
    });
  } catch (error) {
    console.error("Get FAQ Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createFaq = async (req, res) => {
  try {
    const { title, answer, scope = "organization", branchId } = req.body;
    const trimmedTitle = title?.trim();
    const trimmedAnswer = answer?.trim();

    if (!trimmedTitle || !trimmedAnswer) {
      return res.status(400).json({
        success: false,
        message: "Title and answer are required.",
      });
    }

    const resolved = await validateScopeAndBranch(scope, branchId ?? null);

    const result = await query(
      `
        INSERT INTO faqs (title, answer, scope, branch_id)
        VALUES (?, ?, ?, ?)
      `,
      [trimmedTitle, trimmedAnswer, resolved.scope, resolved.branchId]
    );

    const rows = await query(
      `
        SELECT
          id,
          title,
          answer,
          scope,
          branch_id AS branchId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM faqs
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully.",
      data: formatFaq(rows[0]),
    });
  } catch (error) {
    console.error("Create FAQ Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateFaq = async (req, res) => {
  try {
    const faqId = Number(req.params.id);
    const { title, answer, scope = "organization", branchId } = req.body;

    if (!Number.isInteger(faqId) || faqId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ id.",
      });
    }

    const existingRows = await query(`SELECT id, scope, branch_id AS branchId FROM faqs WHERE id = ?`, [faqId]);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    const resolved = await validateScopeAndBranch(scope, branchId ?? null);
    const trimmedTitle = title?.trim();
    const trimmedAnswer = answer?.trim();

    if (!trimmedTitle || !trimmedAnswer) {
      return res.status(400).json({
        success: false,
        message: "Title and answer are required.",
      });
    }

    await query(
      `
        UPDATE faqs
        SET title = ?, answer = ?, scope = ?, branch_id = ?
        WHERE id = ?
      `,
      [trimmedTitle, trimmedAnswer, resolved.scope, resolved.branchId, faqId]
    );

    const rows = await query(
      `
        SELECT
          id,
          title,
          answer,
          scope,
          branch_id AS branchId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM faqs
        WHERE id = ?
      `,
      [faqId]
    );

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully.",
      data: formatFaq(rows[0]),
    });
  } catch (error) {
    console.error("Update FAQ Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteFaq = async (req, res) => {
  try {
    const faqId = Number(req.params.id);

    if (!Number.isInteger(faqId) || faqId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ id.",
      });
    }

    await query(`DELETE FROM faqs WHERE id = ?`, [faqId]);

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully.",
    });
  } catch (error) {
    console.error("Delete FAQ Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
