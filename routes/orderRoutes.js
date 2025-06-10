const express = require('express');
const router = express.Router();
const { placeOrder, getMyOrders, getOrderById, getAllOrders, updateOrder, createPayment, verifyPayment } = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
router.post("/", protect, placeOrder);

// @desc    Get logged in user's orders
// @route   GET /api/orders/my
// @access  Private
router.get("/my", protect, getMyOrders);

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Admin
router.get("/:id", protect, admin, getOrderById);

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
router.get("/", protect, admin, getAllOrders);

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id
// @access  Private/Admin
router.put("/:id", protect, admin, updateOrder);

// Razorpay routes
router.post('/create-payment', protect, createPayment);
router.post('/verify-payment', protect, verifyPayment);

module.exports = router;
