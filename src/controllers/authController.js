// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const emailSvc = require('../lib/email');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const safeUser = (u) => ({ 
  id: u.id, 
  name: u.name, 
  email: u.email, 
  role: u.role,
  userType: u.userType,
  businessName: u.businessName,
  subscriptionPlan: u.subscriptionPlan,
  twoFactorEnabled: u.twoFactorEnabled || false
});

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, userType = 'consumer', businessName, businessABN, businessPhone } = req.body;
    
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    
    if (!['consumer', 'vendor', 'both'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    if (userType === 'vendor' || userType === 'both') {
      if (!businessName) {
        return res.status(400).json({ error: 'Business name is required for vendor accounts' });
      }
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        passwordHash,
        phone: phone || null,
        role: 'user',
        userType: userType,
        businessName: businessName || null,
        businessABN: businessABN || null,
        businessPhone: businessPhone || null,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    emailSvc.sendVerification({ to: user.email, name: user.name, token: verifyToken }).catch(console.error);

    res.status(201).json({
      token: generateToken(user.id),
      user: safeUser(user),
      message: 'Account created! Please check your email to verify.',
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash)
      return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.isActive)
      return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.json({ 
        requiresTwoFactor: true, 
        userId: user.id,
        message: '2FA verification required' 
      });
    }

    res.json({ token: generateToken(user.id), user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/verify-2fa-login
const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ error: 'User ID and token are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      res.json({ token: generateToken(user.id), user: safeUser(user) });
    } else {
      res.status(401).json({ error: 'Invalid 2FA code' });
    }
  } catch (err) {
    console.error('2FA login error:', err);
    res.status(500).json({ error: '2FA verification failed' });
  }
};

// POST /api/auth/enable-2fa
const enable2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `OzBiz:${req.user.email}` });
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret.base32, twoFactorEnabled: false }
    });
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode: qrCodeUrl });
  } catch (err) {
    console.error('Enable 2FA error:', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
};

// POST /api/auth/verify-2fa
const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not setup' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });
    
    if (verified) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { twoFactorEnabled: true }
      });
      res.json({ success: true, message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('Verify 2FA error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// POST /api/auth/disable-2fa
const disable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not enabled' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });
    
    if (verified || !user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { twoFactorSecret: null, twoFactorEnabled: false }
      });
      res.json({ success: true, message: '2FA disabled' });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('Disable 2FA error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// POST /api/auth/google
const googleLogin = async (req, res) => {
  try {
    if (!googleClient) return res.status(503).json({ error: 'Google login not configured' });
    const { credential, userType = 'consumer' } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email: googleEmail, name, picture } = ticket.getPayload();

    let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email: googleEmail }] } });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, provider: 'google', emailVerified: true, avatarUrl: picture || user.avatarUrl },
        });
      }
      if (!user.isActive) return res.status(403).json({ error: 'Account suspended.' });
    } else {
      user = await prisma.user.create({
        data: {
          name: name || googleEmail.split('@')[0],
          email: googleEmail,
          googleId,
          provider: 'google',
          emailVerified: true,
          isActive: true,
          avatarUrl: picture || null,
          userType: userType,
        },
      });
      emailSvc.sendWelcome({ to: user.email, name: user.name }).catch(console.error);
    }

    res.json({ token: generateToken(user.id), user: safeUser(user) });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
};

// GET /api/auth/verify-email?token=
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token, emailVerifyExpiry: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });

    emailSvc.sendWelcome({ to: user.email, name: user.name }).catch(console.error);
    res.json({ message: 'Email verified! You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase() } });
    if (user && !user.emailVerified) {
      const verifyToken = uuidv4();
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifyToken: verifyToken, emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      emailSvc.sendVerification({ to: user.email, name: user.name, token: verifyToken }).catch(console.error);
    }
    res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
  } catch {
    res.status(500).json({ error: 'Failed to resend verification' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase() } });
    if (user && user.provider === 'local' && user.passwordHash) {
      const resetToken = uuidv4();
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000) },
      });
      emailSvc.sendPasswordReset({ to: user.email, name: user.name, token: resetToken }).catch(console.error);
    }
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8)
      return res.status(400).json({ error: 'Valid token and password (8+ chars) required' });

    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12), passwordResetToken: null, passwordResetExpiry: null },
    });
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, userType: true,
        phone: true, avatarUrl: true, emailVerified: true, provider: true,
        newsletterSubscribed: true, createdAt: true,
        businessName: true, businessABN: true, businessPhone: true,
        subscriptionPlan: true, subscriptionExpiresAt: true,
        twoFactorEnabled: true,
      },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, userType, businessName, businessABN, businessPhone, businessAddress } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (userType !== undefined && ['consumer', 'vendor', 'both'].includes(userType)) updateData.userType = userType;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessABN !== undefined) updateData.businessABN = businessABN;
    if (businessPhone !== undefined) updateData.businessPhone = businessPhone;
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true, userType: true,
        phone: true, businessName: true, businessABN: true, businessPhone: true,
      },
    });
    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Profile update failed' });
  }
};

// PUT /api/auth/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8)
      return res.status(400).json({ error: 'Invalid password data' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.passwordHash) return res.status(400).json({ error: 'No password set on this account' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ error: 'Password change failed' });
  }
};

// POST /api/auth/upgrade-to-vendor
const upgradeToVendor = async (req, res) => {
  try {
    const { businessName, businessABN, businessPhone, businessAddress } = req.body;
    
    if (!businessName) {
      return res.status(400).json({ error: 'Business name is required' });
    }
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        userType: 'both',
        businessName,
        businessABN: businessABN || null,
        businessPhone: businessPhone || null,
        businessAddress: businessAddress || null,
      },
    });
    
    res.json({ 
      message: 'Successfully upgraded to vendor! You can now list your business.',
      user: safeUser(user)
    });
  } catch (err) {
    console.error('Upgrade to vendor error:', err);
    res.status(500).json({ error: 'Failed to upgrade account' });
  }
};

module.exports = {
  register, login, googleLogin, verifyEmail, resendVerification,
  forgotPassword, resetPassword, getMe, updateProfile, changePassword,
  upgradeToVendor,
  enable2FA, verify2FA, disable2FA, verifyTwoFactorLogin,
};