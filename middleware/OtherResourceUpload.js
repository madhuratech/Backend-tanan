import multer from "multer";
import path from "path";
import fs from "fs";

const uploadPath = path.join("uploads", "other-resources");

// Create folder if it doesn't exist
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const allowed = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
  ];

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, Word, Excel and PowerPoint files are allowed."));
  }
};

export default multer({
  storage,
  fileFilter,
});