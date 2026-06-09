const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const USE_S3 = Boolean(process.env.S3_BUCKET);

// ── S3 storage (loaded lazily so the app starts without AWS creds) ─────────
function buildS3Storage() {
  const { S3Client } = require('@aws-sdk/client-s3');
  const multerS3    = require('multer-s3');

  const s3 = new S3Client({
    region:   process.env.S3_REGION   || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE),
  });

  return multerS3({
    s3,
    bucket:      process.env.S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
      const lang          = req.body.target_language || 'unknown';
      const sampleId      = req.body.sample_id       || 'unknown';
      const contributorId = req.user?.id             || 'unknown';
      const ext           = path.extname(file.originalname) || '.webm';
      const name = file.fieldname === 'english_audio' ? `en${ext}` : `${lang}${ext}`;
      cb(null, `audio/${lang}/${sampleId}/${contributorId}/${name}`);
    },
  });
}

// ── Local disk storage ────────────────────────────────────────────────────
function buildDiskStorage() {
  return multer.diskStorage({
    destination(req, _file, cb) {
      const lang          = req.body.target_language || 'unknown';
      const sampleId      = req.body.sample_id       || 'unknown';
      const contributorId = req.user?.id             || 'unknown';
      const dir = path.join(__dirname, '../../uploads/audio', lang, sampleId, contributorId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const lang = req.body.target_language || 'unknown';
      const ext  = path.extname(file.originalname) || '.webm';
      const name = file.fieldname === 'english_audio' ? `en${ext}` : `${lang}${ext}`;
      cb(null, name);
    },
  });
}

const audioFilter = (_req, file, cb) => {
  const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only WAV/MP3/WebM audio files are accepted'));
};

// ── Avatar storage ────────────────────────────────────────────────────────────

function buildAvatarS3Storage(resolveId) {
  const { S3Client } = require('@aws-sdk/client-s3');
  const multerS3    = require('multer-s3');

  const s3 = new S3Client({
    region:      process.env.S3_REGION   || 'us-east-1',
    endpoint:    process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE),
  });

  return multerS3({
    s3,
    bucket:      process.env.S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `avatars/${resolveId(req)}${ext}`);
    },
  });
}

function buildAvatarDiskStorage(resolveId) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dir = path.join(__dirname, '../../uploads/avatars');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${resolveId(req)}${ext}`);
    },
  });
}

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(Object.assign(new Error('Only JPEG, PNG, GIF, or WebP images are accepted'), { status: 400 }));
};

function uploadAvatar(getUserId) {
  const resolveId = getUserId || ((req) => req.user.id);
  return multer({
    storage:    USE_S3 ? buildAvatarS3Storage(resolveId) : buildAvatarDiskStorage(resolveId),
    fileFilter: imageFilter,
    limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  }).single('photo');
}

/**
 * Dual-field upload: accepts `english_audio` (English reading) and `audio`
 * (target-language recording). Files land in the same folder with names
 * `en.webm` and `{language}.webm` so pairing is self-evident from the path.
 */
function uploadDualAudio() {
  return multer({
    storage:    USE_S3 ? buildS3Storage() : buildDiskStorage(),
    fileFilter: audioFilter,
    limits:     { fileSize: 50 * 1024 * 1024 },
  }).fields([
    { name: 'english_audio', maxCount: 1 },
    { name: 'audio',         maxCount: 1 },
  ]);
}

/**
 * Extracts both audio paths from req.files (multer fields result).
 * Returns { audioPath, englishAudioPath } — either may be null.
 */
function resolveAudioPaths(files) {
  if (!files) return { audioPath: null, englishAudioPath: null };

  function resolve(file) {
    if (!file) return null;
    if (USE_S3) return file.location;
    return file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
  }

  return {
    audioPath:        resolve(files.audio?.[0]),
    englishAudioPath: resolve(files.english_audio?.[0]),
  };
}

module.exports = { uploadDualAudio, resolveAudioPaths, uploadAvatar };
