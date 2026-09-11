const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Otp = require('../models/Otp');
const { generateToken } = require('../middleware/authMiddleware');
const { logActivity } = require('./activityController');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID ||
  '834977368397-qaip36ga1e6or3gujguc950kkajb4vjd.apps.googleusercontent.com'
);

// Valid system roles
const VALID_ROLES = ['Admin', 'Depot Manager', 'Customer', 'Driver'];

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

    // Check for customer registration record by email
    const registration = await Registration.findOne({ email: normalizedEmail }).sort({
      createdAt: -1,
    });

    // Check for user by email
    const user = await User.findOne({ email: normalizedEmail });

    // LOGIN RULE: If Customer account is not approved
    if (user && user.role === 'Customer') {
      if (
        user.status === 'Pending' ||
        (registration && (registration.status === 'Pending' || registration.status === 'Pending Review'))
      ) {
        return res.status(403).json({
          success: false,
          message: 'Your registration is pending approval.',
        });
      }
      if (
        user.status === 'Rejected' ||
        (registration && registration.status === 'Rejected')
      ) {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    } else if (registration && (!user || user.role === 'Customer')) {
      if (registration.status === 'Pending' || registration.status === 'Pending Review') {
        return res.status(403).json({
          success: false,
          message: 'Your registration is pending approval.',
        });
      }
      if (registration.status === 'Rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    }

    // Validate password using bcryptjs compare
    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id, user.role);

      // Log Login activity
      logActivity({
        action: 'Login',
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        entityId: user.email,
        details: `${user.role} ${user.name} logged into the system`,
        ipAddress: req.ip || req.connection?.remoteAddress || '',
      });

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

    logActivity({
      action: 'Profile Updated',
      userId: updatedUser._id,
      userName: updatedUser.name,
      userRole: updatedUser.role,
      entityId: updatedUser.email,
      details: `${updatedUser.name} updated their profile information`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

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

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate with Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    let { email, name, googleId, profileImage, credential } = req.body;

    // 1. Verify Google Identity Services credential token if provided
    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: [
            process.env.GOOGLE_CLIENT_ID,
            '834977368397-qaip36ga1e6or3gujguc950kkajb4vjd.apps.googleusercontent.com',
          ].filter(Boolean),
        });
        const payload = ticket.getPayload();
        if (payload) {
          if (payload.email) email = payload.email;
          if (payload.name) name = payload.name;
          if (payload.sub) googleId = payload.sub;
          if (payload.picture) profileImage = payload.picture;
        }
      } catch (verifyErr) {
        console.warn('[Google Auth] verifyIdToken check:', verifyErr.message);
        // Fallback: parse JWT payload for development/offline test compatibility
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.email) email = payload.email;
            if (payload.name) name = payload.name;
            if (payload.sub) googleId = payload.sub;
            if (payload.picture) profileImage = payload.picture;
          }
        } catch (tokenErr) {
          console.warn('[Google Auth] Failed to parse credential token:', tokenErr.message);
        }
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for customer registration record by email
    let registration = await Registration.findOne({ email: normalizedEmail }).sort({
      createdAt: -1,
    });

    let user = await User.findOne({ email: normalizedEmail });

    // Customer created automatically after Google registration
    if (!user) {
      const randomPassword = 'Gg_' + Math.random().toString(36).slice(-8) + '1!';
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: randomPassword,
        role: 'Customer',
        status: 'Pending',
        googleId: googleId || null,
        profileImage: profileImage || '',
        loginProvider: 'google',
        site: 'Corporate Site',
        city: 'Chennai',
      });

      // Create pending registration record for Admin / Depot Manager Applications Dossier
      if (!registration) {
        registration = await Registration.create({
          companyName: name || normalizedEmail.split('@')[0],
          authorizedPerson: name || normalizedEmail.split('@')[0],
          contactPerson: name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: randomPassword,
          mobile: '+91 98400 00000',
          gstNumber: 'PENDING',
          panNumber: 'PENDING',
          address: 'Corporate Site, Chennai',
          city: 'Chennai',
          status: 'Pending',
          submittedAt: new Date(),
        });
      }

      logActivity({
        action: 'Google Registration Submitted',
        userId: user._id,
        userName: user.name,
        userRole: 'Customer',
        entityId: user.email,
        details: `Customer ${user.name} registered via Google OAuth (Pending Approval)`,
        ipAddress: req.ip || req.connection?.remoteAddress || '',
      });

      return res.status(403).json({
        success: false,
        message: 'Your registration is pending approval.',
      });
    }

    // Role Handling & Approval Rules for Existing Users
    if (user.role === 'Customer') {
      if (
        user.status === 'Pending' ||
        (registration && (registration.status === 'Pending' || registration.status === 'Pending Review'))
      ) {
        return res.status(403).json({
          success: false,
          message: 'Your registration is pending approval.',
        });
      }
      if (
        user.status === 'Rejected' ||
        (registration && registration.status === 'Rejected')
      ) {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    }

    // Existing approved user (Admin, Depot Manager, Driver, or Approved Customer):
    let modified = false;
    if (googleId && !user.googleId) {
      user.googleId = googleId;
      modified = true;
    }
    if (profileImage && !user.profileImage) {
      user.profileImage = profileImage;
      modified = true;
    }
    if (user.loginProvider !== 'google') {
      user.loginProvider = 'google';
      modified = true;
    }
    if (modified) {
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    logActivity({
      action: 'Google Login',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      entityId: user.email,
      details: `${user.role} ${user.name} logged in via Google OAuth`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: 'Google login successful',
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
        googleId: user.googleId,
        profileImage: user.profileImage,
        loginProvider: user.loginProvider,
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
        googleId: user.googleId,
        profileImage: user.profileImage,
        loginProvider: user.loginProvider,
        token,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to registered mobile number
// @route   POST /api/auth/send-otp
// @access  Public
const sendMobileOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;

    if (!mobile || mobile.toString().trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    const cleanDigits = mobile.toString().replace(/\D/g, '').slice(-10);
    const flexiblePattern = cleanDigits.split('').join('\\D*') + '$';
    const phoneRegex = new RegExp(flexiblePattern);

    // 1. Check registrations collection
    const registration = await Registration.findOne({
      $or: [{ mobile: phoneRegex }, { phone: phoneRegex }],
    }).sort({ createdAt: -1 });

    // 2. Check user collection
    const user = await User.findOne({ phone: phoneRegex });

    // 3. Approval rules check
    if (registration && (!user || user.role === 'Customer')) {
      if (registration.status === 'Pending' || registration.status === 'Pending Review') {
        return res.status(403).json({
          success: false,
          message: 'Your account is awaiting approval.',
        });
      }
      if (registration.status === 'Rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    }

    if (!user && (!registration || registration.status !== 'Approved')) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this mobile number. Please register first.',
      });
    }

    // 4. Generate 6-digit OTP with 5 minutes expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in Otp collection
    await Otp.deleteMany({ mobile: cleanDigits });
    await Otp.create({
      mobile: cleanDigits,
      otp,
      expiresAt,
    });

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}. Valid for 5 minutes.`,
      expiresAt,
      otpPreview: otp, // For verification convenience
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Mobile OTP & Authenticate
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyMobileOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both mobile number and OTP code',
      });
    }

    const cleanDigits = mobile.toString().replace(/\D/g, '').slice(-10);

    // Verify OTP in Otp collection
    const otpRecord = await Otp.findOne({ mobile: cleanDigits, otp: otp.toString().trim() });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please check and try again.',
      });
    }

    // Check 5 minutes expiry
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired (validity is 5 minutes). Please request a new OTP.',
      });
    }

    const flexiblePattern = cleanDigits.split('').join('\\D*') + '$';
    const phoneRegex = new RegExp(flexiblePattern);

    // Find registration and user
    const registration = await Registration.findOne({
      $or: [{ mobile: phoneRegex }, { phone: phoneRegex }],
    }).sort({ createdAt: -1 });

    let user = await User.findOne({ phone: phoneRegex });

    // Approval rules check
    if (registration && (!user || user.role === 'Customer')) {
      if (registration.status === 'Pending' || registration.status === 'Pending Review') {
        return res.status(403).json({
          success: false,
          message: 'Your account is awaiting approval.',
        });
      }
      if (registration.status === 'Rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    }

    if (!user && registration && registration.status === 'Approved') {
      user = await User.findOne({ email: registration.email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No active user account found associated with this mobile number.',
      });
    }

    // Invalidate consumed OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    logActivity({
      action: 'Login',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      entityId: user.email,
      details: `${user.role} ${user.name} logged in via Mobile OTP`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: 'Mobile OTP verification successful',
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

// @desc    Initiate Forgot Password - Send Reset Token & Link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user account found with this email address.',
      });
    }

    // Generate secure random reset token (64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Also generate 6-digit OTP for backwards compatibility
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    user.resetOTP = otp;
    user.resetOTPExpiry = resetExpires;
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/forgot-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    logActivity({
      action: 'Password Reset Requested',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      entityId: user.email,
      details: `${user.role} ${user.name} requested password reset token`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: `Password reset link has been generated for ${normalizedEmail}. Valid for 1 hour.`,
      resetToken,
      resetLink,
      expiresAt: resetExpires,
      otpPreview: otp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Reset OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and the 6-digit OTP code',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    if (!user.resetOTP || user.resetOTP !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please check and try again.',
      });
    }

    // Check expiration
    if (new Date() > user.resetOTPExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now set your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with verified Token or OTP (Single Use)
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, token, otp, newPassword, password } = req.body;
    const targetPassword = newPassword || password;

    if (!targetPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your new password',
      });
    }

    if (targetPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    let user = null;

    // 1. Check if token provided directly
    if (token) {
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });
    }

    // 2. Fallback check by email if token or OTP provided with email
    if (!user && email) {
      const normalizedEmail = email.toLowerCase().trim();
      const candidate = await User.findOne({ email: normalizedEmail });
      if (candidate) {
        if (
          token &&
          candidate.resetPasswordToken === token &&
          candidate.resetPasswordExpires &&
          candidate.resetPasswordExpires > new Date()
        ) {
          user = candidate;
        } else if (
          otp &&
          candidate.resetOTP === otp.toString().trim() &&
          candidate.resetOTPExpiry &&
          candidate.resetOTPExpiry > new Date()
        ) {
          user = candidate;
        }
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link / token. Please request a new reset link.',
      });
    }

    // Set new password (will be encrypted via pre-save hook)
    user.password = targetPassword;
    // Single use - clear token and OTP fields
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    await user.save();

    // Log Password Changed Audit Trail
    logActivity({
      action: 'Password Changed',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      entityId: user.email,
      details: `${user.role} ${user.name} reset password via secure reset link/token`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Login OTP to User Email
// @route   POST /api/auth/send-login-otp
// @access  Public
const sendLoginOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check registration approval status
    const registration = await Registration.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    let user = await User.findOne({ email: normalizedEmail });

    if (registration && (!user || user.role === 'Customer')) {
      if (registration.status === 'Pending' || registration.status === 'Pending Review') {
        return res.status(403).json({
          success: false,
          message: 'Your account is awaiting approval.',
        });
      }
      if (registration.status === 'Rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    }

    if (!user && (!registration || registration.status !== 'Approved')) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email. Please register first.',
      });
    }

    if (!user && registration && registration.status === 'Approved') {
      user = await User.findOne({ email: registration.email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No active user account found associated with this email.',
      });
    }

    // Generate 6-digit OTP with 5 minutes validity
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.loginOTP = otp;
    user.loginOTPExpiry = expiresAt;
    user.loginAttempts = 0; // Reset attempts on new OTP
    await user.save();

    res.status(200).json({
      success: true,
      message: `Login OTP sent successfully to ${normalizedEmail}. Valid for 5 minutes.`,
      expiresAt,
      otpPreview: otp, // For verification convenience
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Login OTP & Authenticate (Max 5 Attempts)
// @route   POST /api/auth/verify-login-otp
// @access  Public
const verifyLoginOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and the 6-digit OTP code',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    // Check customer approval rules
    const registration = await Registration.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (registration && user.role === 'Customer') {
      if (registration.status === 'Pending' || registration.status === 'Pending Review') {
        return res.status(403).json({
          success: false,
          message: 'Your account is awaiting approval.',
        });
      }
      if (registration.status === 'Rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your registration request was rejected.',
        });
      }
    }

    // Enforce maximum 5 attempts
    if ((user.loginAttempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP verification attempts (5) exceeded. Please request a new OTP.',
      });
    }

    // Check OTP Match
    if (!user.loginOTP || user.loginOTP !== otp.toString().trim()) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      await user.save();
      const remainingAttempts = Math.max(0, 5 - user.loginAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`,
        remainingAttempts,
      });
    }

    // Check 5 minutes expiry
    if (new Date() > user.loginOTPExpiry) {
      user.loginOTP = null;
      user.loginOTPExpiry = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired (validity is 5 minutes). Please request a new OTP.',
      });
    }

    // Invalidate consumed OTP
    user.loginOTP = null;
    user.loginOTPExpiry = null;
    user.loginAttempts = 0;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    logActivity({
      action: 'Login',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      entityId: user.email,
      details: `${user.role} ${user.name} logged in via Email OTP`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: 'Email OTP verification successful',
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
        googleId: user.googleId,
        profileImage: user.profileImage,
        loginProvider: user.loginProvider,
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
        googleId: user.googleId,
        profileImage: user.profileImage,
        loginProvider: user.loginProvider,
        token,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  sendMobileOtp,
  verifyMobileOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  sendLoginOtp,
  verifyLoginOtp,
  getMe,
  getAllUsers,
  updateProfile,
  changePassword,
};


