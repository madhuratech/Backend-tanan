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
  console.log("🌱 Seeding questions...");

  const questions = [
    {
      title: "How do I become a TANAN member?",
      description:
        "Complete the online membership application and submit the required documents.",
      url: "https://tanan.no/membership",
    },
    {
      title: "Where can I register for events?",
      description:
        "All upcoming events are available on the Events page of the TANAN website.",
      url: "https://tanan.no/events",
    },
    {
      title: "How do I contact TANAN?",
      description:
        "Visit the Contact page to reach the TANAN head office.",
      url: "https://tanan.no/contact",
    },
  ];

  for (const q of questions) {
    await connection.execute(
      `INSERT INTO questions
      (title, description, url, scope, branch_id)
      VALUES (?, ?, ?, 'organization', NULL)`,
      [q.title, q.description, q.url]
    );
  }

  console.log("✅ Questions inserted successfully!\n");

  const [rows] = await connection.query(
    `SELECT id, title, description, url
     FROM questions
     ORDER BY id DESC`
  );

  console.table(rows);
} catch (err) {
  console.error("❌ Seeder Error:", err);
} finally {
  await connection.end();
}