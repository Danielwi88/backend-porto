import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";

const rootUploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

fs.mkdirSync(rootUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, rootUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").slice(0, 8);
    const safeExt = ext && /^\.[A-Za-z0-9]+$/.test(ext) ? ext : "";
    cb(null, `${randomUUID()}${safeExt}`);
  },
});

export const upload = multer({ storage });
export const uploadsDir = rootUploadDir;
export const publicUrlFor = (filename: string) => `/uploads/${filename}`;
