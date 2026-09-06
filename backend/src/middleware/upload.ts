import multer from "multer";

// Memory storage: files are small (photo/CV), and lib/storage.ts's putObject
// takes a Buffer directly — no need to touch disk before persisting them.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
});
