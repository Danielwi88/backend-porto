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

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/avif", "image/jpg", "image/pjpeg"]);

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mimetype = (file.mimetype || "").toLowerCase();
  if (allowedMimeTypes.has(mimetype)) return cb(null, true);

  const error = Object.assign(new Error("Unsupported image type"), { status: 400 });
  cb(error);
};

export const upload = multer({ storage, fileFilter });
export const uploadsDir = rootUploadDir;

const rawPublicBase = process.env.PUBLIC_API_URL?.trim();
const publicBaseUrl = rawPublicBase ? rawPublicBase.replace(/\/$/, "") : "";

export const publicUrlFor = (filename: string) => {
  const pathSegment = `/uploads/${filename}`;
  return publicBaseUrl ? `${publicBaseUrl}${pathSegment}` : pathSegment;
};
