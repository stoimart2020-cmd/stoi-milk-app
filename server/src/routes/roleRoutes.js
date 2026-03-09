const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { getRoles, getRoleById, createRole, updateRole, deleteRole } = require("../controllers/roleController");

router.get("/", protect, authorize("SUPERADMIN", "ADMIN"), getRoles);
router.get("/:id", protect, authorize("SUPERADMIN", "ADMIN"), getRoleById);
router.post("/", protect, authorize("SUPERADMIN", "ADMIN"), createRole);
router.put("/:id", protect, authorize("SUPERADMIN", "ADMIN"), updateRole);
router.delete("/:id", protect, authorize("SUPERADMIN", "ADMIN"), deleteRole);

module.exports = router;
