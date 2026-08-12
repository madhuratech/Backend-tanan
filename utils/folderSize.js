import fs from "fs";
import path from "path";

const getFolderSize = (folderPath) => {
  let totalSize = 0;

  // Check if the folder exists
  if (!fs.existsSync(folderPath)) {
    return 0;
  }

  // Get all files inside the folder
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);

    const stats = fs.statSync(filePath);

    // Add only file sizes
    if (stats.isFile()) {
      totalSize += stats.size;
    }
  });

  return totalSize;
};

// Convert bytes to MB
const convertToMB = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2);
};

// Export the functions
export { getFolderSize, convertToMB };