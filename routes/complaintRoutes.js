const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { bookComplaint, getMyComplaints, getAllComplaints, updateComplaint } = require("../controllers/complaintController");
const admin = require("../middleware/adminMiddleware");

router.post("/", protect, bookComplaint);
router.get("/my", protect, getMyComplaints);
router.get("/", protect, admin, getAllComplaints);
router.put("/:id", protect, admin, updateComplaint);

module.exports = router;
