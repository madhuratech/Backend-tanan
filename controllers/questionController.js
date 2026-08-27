import pool from "../config/db.js";

// Get all questions
export const getQuestions = async (req, res) => {
  try {
    const { scope = "organization", branchId = null } = req.query;

    let query = `
      SELECT *
      FROM questions
      WHERE scope = ?
    `;

    const params = [scope];

    if (scope === "regional") {
      query += " AND branch_id = ?";
      params.push(branchId);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.execute(query, params);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Get Questions Error:", error);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

// Create question
export const createQuestion = async (req, res) => {
  try {
    const {
      title,
      description,
      url,
      scope,
      branchId,
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO questions
      (title, description, url, scope, branch_id)
      VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        description,
        url || null,
        scope,
        scope === "regional" ? branchId : null,
      ]
    );

    res.status(201).json({
      message: "Question created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Create Question Error:", error);
    res.status(500).json({ message: "Failed to create question" });
  }
};

// Update question
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      url,
      scope,
      branchId,
    } = req.body;

    await pool.execute(
      `UPDATE questions
       SET title = ?,
           description = ?,
           url = ?,
           scope = ?,
           branch_id = ?
       WHERE id = ?`,
      [
        title,
        description,
        url || null,
        scope,
        scope === "regional" ? branchId : null,
        id,
      ]
    );

    res.status(200).json({
      message: "Question updated successfully",
    });
  } catch (error) {
    console.error("Update Question Error:", error);
    res.status(500).json({ message: "Failed to update question" });
  }
};

// Delete question
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      "DELETE FROM questions WHERE id = ?",
      [id]
    );

    res.status(200).json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Delete Question Error:", error);
    res.status(500).json({ message: "Failed to delete question" });
  }
};