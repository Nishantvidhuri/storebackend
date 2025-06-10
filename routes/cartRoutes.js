const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { 
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart
} = require("../controllers/cartController");

router.route("/").get(protect, getCart).post(protect, addItemToCart).delete(protect, clearCart);
router.route("/:itemId").put(protect, updateCartItemQuantity).delete(protect, removeItemFromCart);

module.exports = router; 