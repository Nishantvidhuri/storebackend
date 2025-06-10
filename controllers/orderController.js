const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config/razorpay');
const twilio = require('twilio'); // Import Twilio

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const adminPhoneNumber = '+919871202673'; // Admin's number to receive notifications

const client = twilio(accountSid, authToken);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Helper function to send SMS notification
const sendSmsNotification = async (message) => {
  try {
    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: adminPhoneNumber,
    });
    console.log('SMS notification sent successfully!');
  } catch (error) {
    console.error('Error sending SMS notification:', error);
  }
};

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      image: item.product.image,
      price: item.product.price,
    }));

    const totalPrice = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const order = new Order({
      user: userId,
      orderItems,
      shippingAddress: address,
      totalPrice,
      paymentMethod,
      isPaid: paymentMethod === 'cod' ? false : false,
      paidAt: null,
      paymentResult: null,
    });

    const createdOrder = await order.save();

    // Send SMS notification to admin
    const smsMessage = `New order placed! Order ID: ${createdOrder._id}. Total Price: ₹${totalPrice.toFixed(2)}. Payment Method: ${paymentMethod.toUpperCase()}.`;
    sendSmsNotification(smsMessage);

    cart.items = [];
    await cart.save();

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ message: "Failed to place order" });
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/my
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate("user", "name email");
    res.json(orders);
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Admin
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "id name email");
    res.json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id
// @access  Private/Admin
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = req.body.isPaid || order.isPaid;
      order.paidAt = req.body.paidAt || order.paidAt;
      order.isDelivered = req.body.isDelivered || order.isDelivered;
      order.deliveredAt = req.body.deliveredAt || order.deliveredAt;
      order.status = req.body.status || order.status;

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
};

// @desc    Create Razorpay order
// @route   POST /api/orders/create-payment
// @access  Private
exports.createPayment = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const options = {
      amount: amount,
      currency: currency,
      receipt: 'receipt_' + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Error creating payment' });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/orders/verify-payment
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderData,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Find the order that was created in the database during initial order placement
      const order = await Order.findById(orderData._id); // Assuming orderData contains _id

      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: razorpay_payment_id,
          status: 'completed',
          update_time: Date.now(),
          email_address: req.user.email,
        };
        const updatedOrder = await order.save();
        // Clear user's cart
        await Cart.findOneAndDelete({ user: req.user._id });
        res.json({ success: true, order: updatedOrder });
      } else {
        res.status(404).json({ success: false, message: 'Order not found' });
      }
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
};
