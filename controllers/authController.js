const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email 
          ? "Email already registered" 
          : "Username already taken" 
      });
    }

    // Hash password
  const hash = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({ 
      username,
      email,
      phone,
      password: hash 
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ 
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

exports.login = async (req, res) => {
  try {
  const { email, password } = req.body;

    // Find user by email
  const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check password
  const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token
  const token = jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, email, phone, shippingAddress } = req.body;
    const userId = req.user.id; // From auth middleware

    // Check if username or email is being changed and if it's already taken
    if (username || email) {
      const existingUser = await User.findOne({
        $or: [
          { username: username },
          { email: email }
        ],
        _id: { $ne: userId } // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          message: existingUser.username === username
            ? "Username already taken"
            : "Email already registered"
        });
      }
    }

    // Prepare update object with only provided fields
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Directly update shippingAddress if it's provided
    if (shippingAddress !== undefined) {
      updateData.shippingAddress = shippingAddress;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password from response
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json({
      message: "Profile updated successfully",
      user: userResponse
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: "Failed to update profile. Please try again." });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      user: userResponse
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: "Failed to fetch user details. Please try again." });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude passwords
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

// @desc    Get user by ID
// @route   GET /api/auth/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch user.' });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update fields if provided
    if (req.body.username !== undefined) user.username = req.body.username;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.address !== undefined) user.address = req.body.address;
    if (req.body.isAdmin !== undefined) user.isAdmin = req.body.isAdmin;

    // Handle password change if provided (optional)
    if (req.body.password) {
        const hash = await bcrypt.hash(req.body.password, 10);
        user.password = hash;
    }

    const updatedUser = await user.save();

    // Return updated user without password
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json(userResponse);

  } catch (error) {
    console.error('Update user error (Admin):', error);
    res.status(500).json({ message: 'Failed to update user.' });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });

  } catch (error) {
    console.error('Delete user error (Admin):', error);
    res.status(500).json({ message: 'Failed to remove user.' });
  }
};
