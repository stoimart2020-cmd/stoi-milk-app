const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect, authorize } = require("../middleware/auth");
const { getComplaints, createComplaint, updateComplaint } = require("../controllers/complaintController");

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/complaints/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, "complaint-" + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter - only accept JPEG and PNG
const fileFilter = (req, file, cb) => {
    // Check mimetype
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log('Rejected file:', file.originalname, 'mimetype:', file.mimetype);
        cb(new Error(`Only JPEG and PNG images are allowed! Received: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 // 1MB limit
    }
});

router.get("/", protect, getComplaints); // Customers can see their own, Staff see all
router.post("/", protect, upload.array("images", 5), createComplaint); // Allow up to 5 images
router.put("/:id", protect, upload.array("images", 5), updateComplaint); // Both customer and admin can update

module.exports = router;
