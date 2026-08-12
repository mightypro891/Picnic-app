import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';
import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from '../utils/validators.js';

// Files are held in memory only long enough to stream straight to Supabase
// Storage — nothing is ever written to this server's local disk, since that
// disk isn't persistent on most free hosts.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk || !extOk) {
    return cb(new Error('UNSUPPORTED_FILE_TYPE'));
  }
  cb(null, true);
}

export const uploadPaymentEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 1,
  },
}).single('paymentEvidence');

/** Wraps multer's callback API in a middleware that produces clean JSON errors. */
export function handleUpload(req, res, next) {
  uploadPaymentEvidence(req, res, (err) => {
    if (!err) return next();

    if (err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({
        error: 'Unsupported file type. Upload a JPG, PNG, WEBP, or PDF file.',
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File is too large. Maximum size is ${env.maxUploadSizeMb}MB.`,
      });
    }
    console.error('Upload error:', err);
    return res.status(400).json({ error: 'Could not process the uploaded file.' });
  });
}
