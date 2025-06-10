const router = require("express").Router();
const { register, login, updateUser, getUserDetails, getUsers, getUserById, updateUserByAdmin, deleteUserByAdmin } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

router.post("/register", register);
router.post("/login", login);
router.put("/profile", protect, updateUser);
router.get("/me", protect, getUserDetails);

// Admin User Management Routes
router.route("/users").get(protect, admin, getUsers);
router.route("/users/:id").get(protect, admin, getUserById).put(protect, admin, updateUserByAdmin).delete(protect, admin, deleteUserByAdmin);

module.exports = router;
