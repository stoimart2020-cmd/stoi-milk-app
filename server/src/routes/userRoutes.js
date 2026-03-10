const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
    getAllUsers,
    updateUserRole,
    createUser,
    updateUser,
    getUserById,
    updateUserProfile
} = require("../controllers/userController");
const { attachScope } = require("../middleware/scope");

router.get("/", protect, authorize("SUPERADMIN", "ADMIN", "FINANCE_TEAM"), attachScope, getAllUsers);
router.post("/", protect, authorize("SUPERADMIN"), createUser);
router.put("/profile", protect, updateUserProfile);
router.put("/:id/role", protect, authorize("SUPERADMIN"), updateUserRole);
router.put("/:id", protect, authorize("SUPERADMIN"), updateUser);
router.get("/:id", protect, authorize("SUPERADMIN", "ADMIN"), getUserById);

module.exports = router;
