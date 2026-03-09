const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect, adminOnly } = require("../middleware/auth");
const backupController = require("../controllers/backupController");

// Store upload in memory (we handle temp file ourselves)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
            cb(null, true);
        } else {
            cb(new Error("Only .zip backup files are accepted"));
        }
    },
});

// GET /api/backup/info — collection record counts
router.get("/info", protect, adminOnly, backupController.getBackupInfo);

// GET /api/backup/download — download full ZIP backup
router.get("/download", protect, adminOnly, backupController.downloadBackup);

// POST /api/backup/restore — upload and restore from ZIP
router.post("/restore", protect, adminOnly, upload.single("backup"), backupController.restoreBackup);

module.exports = router;
