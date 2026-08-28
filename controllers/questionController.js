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

   query += " ORDER BY position ASC";

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

    // Get next position for this scope
    const [rows] = await pool.execute(
      `SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition
       FROM questions
       WHERE scope = ?`,
      [scope]
    );

    const position = rows[0].nextPosition;

    const [result] = await pool.execute(
      `INSERT INTO questions
      (title, description, url, scope, branch_id, position)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        url || null,
        scope,
        scope === "regional" ? branchId : null,
        position,
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

// Reorder questions
export const reorderQuestions = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { items } = req.body;

    await connection.beginTransaction();

    for (const item of items) {
      await connection.execute(
        "UPDATE questions SET position = ? WHERE id = ?",
        [item.position, item.id]
      );
    }

    await connection.commit();

    res.status(200).json({
      message: "Question order updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Reorder Question Error:", error);

    res.status(500).json({
      message: "Failed to update question order",
    });
  } finally {
    connection.release();
  }
};