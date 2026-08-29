import db from "../config/db.js";

const resources = [
  {
    title: "Client Agreement",
    description: "Main agreement document",
    file_name: "client-agreement.pdf",
    file_path: "uploads/other-resources/client-agreement.pdf",
    file_type: "pdf",
  },
  {
    title: "Annual Financial Report",
    description: "2026 financial report",
    file_name: "financial-report.xlsx",
    file_path: "uploads/other-resources/financial-report.xlsx",
    file_type: "xlsx",
  },
  {
    title: "Presentation Template",
    description: "Company presentation template",
    file_name: "company-template.pptx",
    file_path: "uploads/other-resources/company-template.pptx",
    file_type: "pptx",
  },
  {
    title: "Employee Handbook",
    description: "Word document handbook",
    file_name: "employee-handbook.docx",
    file_path: "uploads/other-resources/employee-handbook.docx",
    file_type: "docx",
  },
];

const seedOtherResources = async () => {
  try {
    // Create table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS other_resources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type ENUM(
          'pdf','doc','docx','xls','xlsx','ppt','pptx'
        ) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Table ready");

    // Clear existing records
    await db.query("DELETE FROM other_resources");

    // Reset auto increment
    await db.query("ALTER TABLE other_resources AUTO_INCREMENT = 1");

    // Insert data
    for (const item of resources) {
      await db.query(
        `INSERT INTO other_resources
        (title, description, file_name, file_path, file_type)
        VALUES (?, ?, ?, ?, ?)`,
        [
          item.title,
          item.description,
          item.file_name,
          item.file_path,
          item.file_type,
        ]
      );
    }

    console.log("✅ Other Resources seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder Error:", error);
    process.exit(1);
  }
};

const check = async () => {
  try {
    const [rows] = await db.query("SELECT * FROM other_resources");
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();

seedOtherResources();