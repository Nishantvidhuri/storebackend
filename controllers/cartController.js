const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    // Find the user's cart and populate product details
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price image');

    if (!cart) {
      // If no cart exists, return an empty cart structure
      return res.status(200).json({ user: req.user.id, items: [] });
    }

    // Filter out items where product population failed (e.g., product was deleted)
    cart.items = cart.items.filter(item => item.product !== null);

    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Failed to fetch cart.' });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addItemToCart = async (req, res) => {
  // Expects productId (MongoDB _id) and quantity
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  // Basic validation
  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Invalid product ID or quantity.' });
  }

  try {
    let cart = await Cart.findOne({ user: userId });
    
    // Verify the product exists in the database using the provided ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (cart) {
      // Cart exists for user: check if item is already there
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

      if (itemIndex > -1) {
        // Product already exists in cart, update quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Product not in cart, add new item (only storing product _id and quantity)
        cart.items.push({ product: productId, quantity });
      }
      
      cart = await cart.save();

    } else {
      // No cart for user: create a new cart
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    }

    // Populate the cart to return full product details in the response
    await cart.populate('items.product', 'name price image');
    res.status(cart ? 200 : 201).json(cart);

  } catch (error) {
    console.error('Add item to cart error:', error);
    res.status(500).json({ message: 'Failed to add item to cart.' });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItemQuantity = async (req, res) => {
  // Expects itemId (cart item _id) in params and quantity in body
  const { quantity } = req.body;
  const { itemId } = req.params;
  const userId = req.user.id;

  // Basic validation
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Invalid quantity.' });
  }

  try {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex > -1) {
      // Item found, update quantity
      cart.items[itemIndex].quantity = quantity;
      cart = await cart.save();
      
      // Populate the cart to return full product details
      await cart.populate('items.product', 'name price image');
      res.json(cart);
    } else {
      return res.status(404).json({ message: 'Item not found in cart.' });
    }
  } catch (error) {
    console.error('Update cart item quantity error:', error);
    res.status(500).json({ message: 'Failed to update cart item quantity.' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeItemFromCart = async (req, res) => {
  // Expects itemId (cart item _id) in params
  const { itemId } = req.params;
  const userId = req.user.id;

  try {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    if (cart.items.length === initialLength) {
       return res.status(404).json({ message: 'Item not found in cart.' });
    }

    cart = await cart.save();
    
    // Populate the cart to return full product details
    await cart.populate('items.product', 'name price image');
    res.json(cart);

  } catch (error) {
    console.error('Remove item from cart error:', error);
    res.status(500).json({ message: 'Failed to remove item from cart.' });
  }
};

// @desc    Clear user cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find and remove the user's cart
    const result = await Cart.findOneAndDelete({ user: userId });

    if (!result) {
       // Cart doesn't exist, nothing to clear
       return res.status(200).json({ message: 'Cart is already empty.' });
    }

    res.json({ message: 'Cart cleared successfully.' });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Failed to clear cart.' });
  }
}; 