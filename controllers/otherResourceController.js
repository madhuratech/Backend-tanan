import db from "../config/db.js";
import fs from "fs";

export const getOtherResources = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM other_resources ORDER BY created_at DESC"
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("GET Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createOtherResource = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const extension = req.file.originalname
      .split(".")
      .pop()
      .toLowerCase();

    const [result] = await db.query(
      `INSERT INTO other_resources
      (title, description, file_name, file_path, file_type)
      VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        req.file.originalname,
        req.file.path.replace(/\\/g, "/"),
        extension,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Resource created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("POST Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateOtherResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM other_resources WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const existing = rows[0];

    let fileName = existing.file_name;
    let filePath = existing.file_path;
    let fileType = existing.file_type;

    if (req.file) {
      if (fs.existsSync(existing.file_path)) {
        fs.unlinkSync(existing.file_path);
      }

      fileName = req.file.originalname;
      filePath = req.file.path.replace(/\\/g, "/");
      fileType = req.file.originalname
        .split(".")
        .pop()
        .toLowerCase();
    }

    await db.query(
      `UPDATE other_resources
       SET title = ?, description = ?, file_name = ?, file_path = ?, file_type = ?
       WHERE id = ?`,
      [title, description, fileName, filePath, fileType, id]
    );

    res.json({
      success: true,
      message: "Resource updated successfully",
    });
  } catch (error) {
    console.error("PUT Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteOtherResource = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM other_resources WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const resource = rows[0];

    if (fs.existsSync(resource.file_path)) {
      fs.unlinkSync(resource.file_path);
    }

    await db.query(
      "DELETE FROM other_resources WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("DELETE Error:", error);
    res.status(500).json({ message: error.message });
  }
};