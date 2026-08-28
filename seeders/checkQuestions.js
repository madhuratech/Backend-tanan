import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  console.log("🌱 Updating questions table...");

  // Add position column if it doesn't exist
  await connection.execute(`
    ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0
  `);

  // Update existing records with position values
  const [rows] = await connection.query(`
    SELECT id
    FROM questions
    ORDER BY created_at ASC
  `);

  for (let i = 0; i < rows.length; i++) {
    await connection.execute(
      `UPDATE questions SET position = ? WHERE id = ?`,
      [i, rows[i].id]
    );
  }

  console.log("✅ Position column updated successfully!\n");

  const [result] = await connection.query(`
    SELECT id, title, position
    FROM questions
    ORDER BY position ASC
  `);

  console.table(result);

} catch (err) {
  console.error("❌ Seeder Error:", err);
} finally {
  await connection.end();
}