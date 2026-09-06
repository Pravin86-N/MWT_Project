const User = require('../models/User');
const { generateToken } = require('../middleware/authMiddleware');

// Valid system roles
const VALID_ROLES = ['Admin', 'Depot Manager', 'Customer'];

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, site, city, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Validate role if provided
    let userRole = 'Customer';
    if (role) {
      if (!VALID_ROLES.includes(role) && role !== 'Driver') {
        return res.status(400).json({
          success: false,
          message: `Invalid role '${role}'. Allowed roles: ${VALID_ROLES.join(', ')}`,
        });
      }
      userRole = role;
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Create user (password is automatically hashed in pre-save hook via bcryptjs)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: userRole,
      site: site || '',
      city: city || '',
      phone: phone || '',
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        site: user.site,
        city: user.city,
        creditLimit: user.creditLimit,
        creditUsed: user.creditUsed,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        site: user.site,
        city: user.city,
        creditLimit: user.creditLimit,
        creditUsed: user.creditUsed,
        phone: user.phone,
        token,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get JWT token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Validate password using bcryptjs compare
    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id, user.role);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          site: user.site,
          city: user.city,
          creditLimit: user.creditLimit,
          creditUsed: user.creditUsed,
          phone: user.phone,
          createdAt: user.createdAt,
        },
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          site: user.site,
          city: user.city,
          creditLimit: user.creditLimit,
          creditUsed: user.creditUsed,
          phone: user.phone,
          token,
          createdAt: user.createdAt,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      user,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin, Depot Manager)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.site = req.body.site || user.site;
    user.city = req.body.city || user.city;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    const token = generateToken(updatedUser._id, updatedUser.role);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      token,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        site: updatedUser.site,
        city: updatedUser.city,
        creditLimit: updatedUser.creditLimit,
        creditUsed: updatedUser.creditUsed,
        phone: updatedUser.phone,
        createdAt: updatedUser.createdAt,
      },
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        site: updatedUser.site,
        city: updatedUser.city,
        creditLimit: updatedUser.creditLimit,
        creditUsed: updatedUser.creditUsed,
        phone: updatedUser.phone,
        token,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  updateProfile,
};
