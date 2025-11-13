import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import multer from "multer";
import sharp from "sharp";

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

const MAX_IMAGE_SIDE = Number(process.env.UPLOAD_MAX_IMAGE_SIDE ?? 1600);
const JPEG_QUALITY = Number(process.env.UPLOAD_JPEG_QUALITY ?? 78);
const PNG_QUALITY = Number(process.env.UPLOAD_PNG_QUALITY ?? 80);
const AVIF_QUALITY = Number(process.env.UPLOAD_AVIF_QUALITY ?? 55);
const MIN_FILE_SIZE_TO_PROCESS = Number(process.env.UPLOAD_MIN_BYTES ?? 20 * 1024);

type RequestWithFile = {
  file?: Express.Multer.File;
};

const getFormatFromMime = (mime?: string) => {
  switch ((mime ?? "").toLowerCase()) {
    case "image/png":
      return "png" as const;
    case "image/avif":
      return "avif" as const;
    default:
      return "jpeg" as const;
  }
};

export const optimizeImage: RequestHandler = async (req, _res, next) => {
  const file = (req as RequestWithFile).file;
  if (!file?.path || !file.mimetype?.startsWith("image/")) return next();

  try {
    const currentStats = await fs.promises.stat(file.path);
    if (currentStats.size < MIN_FILE_SIZE_TO_PROCESS) return next();

    const pipeline = sharp(file.path)
      .rotate()
      .resize({
        width: MAX_IMAGE_SIDE,
        height: MAX_IMAGE_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      });

    const format = getFormatFromMime(file.mimetype);
    if (format === "png") {
      pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9, palette: true });
    } else if (format === "avif") {
      pipeline.avif({ quality: AVIF_QUALITY, effort: 4 });
    } else {
      pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" });
    }

    await pipeline.toFile(file.path);
    const optimizedStats = await fs.promises.stat(file.path);
    file.size = optimizedStats.size;
  } catch (error) {
    console.warn("Failed to optimize uploaded image", error);
  }

  next();
};
