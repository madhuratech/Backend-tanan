import path from "path";
import { fileURLToPath } from "url";

import {
  getFolderSize,
  convertToMB,
} from "../utils/folderSize.js";

// Create __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getStorageDetails = (req, res) => {
  try {
    const eventFolder = path.join(__dirname, "../uploads/events");
    const galleryFolder = path.join(__dirname, "../uploads/galleries");
    const documentFolder = path.join(__dirname, "../uploads/documents");
    const otherResourcesFolder = path.join(
      __dirname,
      "../uploads/other-resources"
    );

    const eventSize = getFolderSize(eventFolder);
    const gallerySize = getFolderSize(galleryFolder);
    const documentSize = getFolderSize(documentFolder);
    const otherResourcesSize = getFolderSize(otherResourcesFolder);

    const totalSize =
      eventSize +
      gallerySize +
      documentSize +
      otherResourcesSize;

    res.status(200).json({
      success: true,
      data: {
        events: `${convertToMB(eventSize)} MB`,
        galleries: `${convertToMB(gallerySize)} MB`,
        documents: `${convertToMB(documentSize)} MB`,
        otherResources: `${convertToMB(otherResourcesSize)} MB`,
        total: `${convertToMB(totalSize)} MB`,
      },
    });
  } catch (error) {
    console.error("Storage Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch storage details.",
    });
  }
};