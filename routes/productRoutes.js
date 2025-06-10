const router = require("express").Router();
const { getAll, getById, add, update, remove } = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", protect, admin, add);
router.put("/:id", protect, admin, update);
router.delete("/:id", protect, admin, remove);

module.exports = router;
