const mongoose = require("mongoose");
const archiver = require("archiver");
const unzipper = require("unzipper");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ─── All collection model names we back up ────────────────────────────────────
// These map directly to the mongoose model names (and thus collection names).
const COLLECTION_MODELS = [
    "User",
    "Order",
    "Subscription",
    "SubscriptionModification",
    "Product",
    "Category",
    "ServiceArea",
    "Hub",
    "Area",
    "Factory",
    "District",
    "City",
    "DeliveryPoint",
    "DeliveryRoute",
    "Employee",
    "Transaction",
    "Invoice",
    "Complaint",
    "Notification",
    "Setting",
    "Referral",
    "Lead",
    "Role",
    "Distributor",
    "Vendor",
    "BottleTransaction",
    "ActivityLog",
    "Counter",
    "MilkCollection",
    "ProductionLog",
    "StockPoint",
];

// Safely load a model — returns null if model is not registered
const getModel = (name) => {
    try {
        return mongoose.model(name);
    } catch {
        return null;
    }
};

// ─── DOWNLOAD BACKUP ─────────────────────────────────────────────────────────
exports.downloadBackup = async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `stoi_backup_${timestamp}.zip`;

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => {
            console.error("Archive error:", err);
            if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
        });

        archive.pipe(res);

        // Include a manifest file
        const manifest = {
            version: "1.0",
            createdAt: new Date().toISOString(),
            appName: "Stoi Milk Delivery",
            collections: [],
        };

        for (const modelName of COLLECTION_MODELS) {
            const Model = getModel(modelName);
            if (!Model) continue;

            try {
                const docs = await Model.find({}).lean();
                const json = JSON.stringify(docs, null, 2);
                archive.append(json, { name: `${modelName}.json` });
                manifest.collections.push({ model: modelName, count: docs.length });
                console.log(`  Backed up ${modelName}: ${docs.length} records`);
            } catch (err) {
                console.warn(`  Skipped ${modelName}: ${err.message}`);
            }
        }

        // Also back up uploaded files if present
        const uploadsDir = path.join(__dirname, "../../uploads");
        if (fs.existsSync(uploadsDir)) {
            archive.directory(uploadsDir, "uploads");
            manifest.includesUploads = true;
        }

        archive.append(JSON.stringify(manifest, null, 2), { name: "_manifest.json" });
        await archive.finalize();

    } catch (error) {
        console.error("Backup error:", error);
        if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
    }
};

// ─── RESTORE BACKUP ──────────────────────────────────────────────────────────
exports.restoreBackup = async (req, res) => {
    let tempDir = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No backup file uploaded." });
        }

        // Write uploaded buffer to a temp file
        tempDir = path.join(os.tmpdir(), `stoi_restore_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        const zipPath = path.join(tempDir, "backup.zip");
        fs.writeFileSync(zipPath, req.file.buffer);

        // Extract zip
        const extractDir = path.join(tempDir, "extracted");
        fs.mkdirSync(extractDir, { recursive: true });

        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: extractDir }))
            .promise();

        // Read manifest
        const manifestPath = path.join(extractDir, "_manifest.json");
        let manifest = null;
        if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        }

        const results = [];
        const errors = [];

        // Restore each collection JSON file
        for (const modelName of COLLECTION_MODELS) {
            const filePath = path.join(extractDir, `${modelName}.json`);
            if (!fs.existsSync(filePath)) continue;

            const Model = getModel(modelName);
            if (!Model) {
                errors.push(`Model not found: ${modelName}`);
                continue;
            }

            try {
                const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));
                if (!Array.isArray(docs)) {
                    errors.push(`Invalid data for ${modelName}`);
                    continue;
                }

                // Clear existing collection
                await Model.deleteMany({});

                // Re-insert with original _id preserved
                if (docs.length > 0) {
                    await Model.insertMany(docs, {
                        ordered: false,
                        rawResult: false,
                    });
                }

                results.push({ collection: modelName, restored: docs.length });
                console.log(`  Restored ${modelName}: ${docs.length} records`);
            } catch (err) {
                console.error(`  Error restoring ${modelName}:`, err.message);
                errors.push(`${modelName}: ${err.message}`);
            }
        }

        // Restore uploads if present
        const uploadsBackupDir = path.join(extractDir, "uploads");
        if (fs.existsSync(uploadsBackupDir)) {
            const serverUploadsDir = path.join(__dirname, "../../uploads");
            fs.mkdirSync(serverUploadsDir, { recursive: true });
            copyDirSync(uploadsBackupDir, serverUploadsDir);
        }

        res.json({
            success: true,
            message: "Database restored successfully.",
            manifest,
            results,
            errors,
        });

    } catch (error) {
        console.error("Restore error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        // Cleanup temp directory
        if (tempDir && fs.existsSync(tempDir)) {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { }
        }
    }
};

// ─── GET BACKUP INFO ─────────────────────────────────────────────────────────
exports.getBackupInfo = async (req, res) => {
    try {
        const info = [];
        let totalRecords = 0;

        for (const modelName of COLLECTION_MODELS) {
            const Model = getModel(modelName);
            if (!Model) continue;
            try {
                const count = await Model.countDocuments({});
                info.push({ collection: modelName, count });
                totalRecords += count;
            } catch {
                info.push({ collection: modelName, count: 0 });
            }
        }

        res.json({
            success: true,
            result: {
                collections: info,
                totalRecords,
                estimatedSizeMB: (totalRecords * 0.002).toFixed(1), // rough estimate
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Helper: recursive directory copy ────────────────────────────────────────
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
