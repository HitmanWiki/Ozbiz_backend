// backend/src/routes/index.js
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const auth = require('../controllers/authController');
const listings = require('../controllers/listingsController');
const admin = require('../controllers/adminController');
const userController = require('../controllers/userController');
const chatbot = require('../controllers/chatbotController');

// ─── Auth ──────────────────────────────────────────────────────────────
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/google', auth.googleLogin);
router.get('/auth/verify-email', auth.verifyEmail);
router.post('/auth/resend-verification', auth.resendVerification);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.get('/auth/me', authenticate, auth.getMe);
router.put('/auth/profile', authenticate, auth.updateProfile);
router.put('/auth/password', authenticate, auth.changePassword);
router.post('/auth/upgrade-to-vendor', authenticate, auth.upgradeToVendor);

// ─── Public Data ───────────────────────────────────────────────────────
router.get('/categories', admin.publicCategories);
router.get('/cities', admin.publicCities);
router.get('/ads', admin.getAds);
router.post('/ads/:id/click', admin.trackAdClick);
router.get('/homepage/featured-products', listings.getFeaturedProducts);
router.get('/homepage/most-visited', listings.getMostVisited);

// Newsletter
router.post('/newsletter/subscribe', admin.subscribeNewsletter);

// ─── Chatbot ──────────────────────────────────────────────────────────
router.post('/chatbot', chatbot.getChatbotResponse);
router.get('/chatbot/suggestions', chatbot.getSuggestedQuestions);

// Blog (public)
router.get('/blogs', admin.getPublicBlogs);
router.get('/blogs/:slug', admin.getPublicBlogBySlug);

// ─── Listings ──────────────────────────────────────────────────────────
// IMPORTANT: Specific routes MUST come BEFORE generic slug routes
router.get('/listings/my', authenticate, listings.getMyListings);
router.get('/listings', listings.getListings);
router.get('/listings/id/:id', authenticate, listings.getListingById);  // Specific ID route FIRST
router.get('/listings/:slug', listings.getListingBySlug);               // Generic slug route SECOND
router.post('/listings', authenticate, listings.createListing);
router.put('/listings/:id', authenticate, listings.updateListing);
router.delete('/listings/:id', authenticate, listings.deleteListing);

// Images
router.post('/listings/:id/images', authenticate, upload.single('image'), listings.addListingImage);
router.delete('/listings/:id/images/:imageId', authenticate, listings.deleteListingImage);

// Products / Services
router.post('/listings/:id/products', authenticate, listings.addProduct);
router.put('/listings/:id/products/:productId', authenticate, listings.updateProduct);
router.delete('/listings/:id/products/:productId', authenticate, listings.deleteProduct);

// Enquiries
router.post('/listings/:id/enquiry', listings.sendEnquiry);
router.get('/listings/:id/enquiries', authenticate, listings.getListingEnquiries);

// Reviews
router.post('/listings/:id/reviews', listings.submitReview);
router.post('/reviews/:reviewId/helpful', listings.markHelpful);

// ─── Enquiry reply (owner) ─────────────────────────────────────────────
router.post('/enquiries/:enquiryId/reply', authenticate, listings.replyToEnquiry);

// ============================================================
// CONSUMER FEATURES
// ============================================================

// Favorites
router.get('/user/favorites', authenticate, userController.getFavorites);
router.post('/user/favorites', authenticate, userController.addFavorite);
router.delete('/user/favorites/:listingId', authenticate, userController.removeFavorite);

// Enquiry History
router.get('/user/enquiries', authenticate, userController.getEnquiryHistory);

// Search History
router.get('/user/search-history', authenticate, userController.getSearchHistory);
router.post('/user/search-history', authenticate, userController.saveSearchHistory);
router.delete('/user/search-history', authenticate, userController.clearSearchHistory);

// Notification Settings
router.get('/user/notification-settings', authenticate, userController.getNotificationSettings);
router.put('/user/notification-settings', authenticate, userController.updateNotificationSettings);

// ============================================================
// VENDOR FEATURES
// ============================================================

// Dashboard & Analytics
router.get('/vendor/dashboard', authenticate, userController.getVendorDashboardStats);
router.get('/vendor/analytics/:listingId', authenticate, userController.getListingAnalytics);

// Lead Management
router.get('/vendor/leads', authenticate, userController.getLeads);
router.patch('/vendor/leads/:enquiryId', authenticate, userController.updateLeadStatus);

// Review Management
router.get('/vendor/reviews', authenticate, userController.getVendorReviews);
router.post('/vendor/reviews/:reviewId/reply', authenticate, userController.replyToReview);
router.post('/vendor/reviews/:reviewId/flag', authenticate, userController.flagReviewAsSpam);

// ============================================================
// SUBSCRIPTION FEATURES
// ============================================================
router.get('/subscription/plans', authenticate, userController.getSubscriptionPlans);
router.post('/subscription/upgrade', authenticate, userController.upgradeSubscription);
router.post('/subscription/cancel', authenticate, userController.cancelSubscription);

// ============================================================
// ADMIN PANEL
// ============================================================
const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);

// Dashboard
adminRouter.get('/stats', admin.getDashboardStats);

// Listing Management
adminRouter.get('/listings', admin.adminGetListings);
adminRouter.patch('/listings/:id/status', admin.updateListingStatus);

// User Management
adminRouter.get('/users', admin.adminGetUsers);
adminRouter.patch('/users/:id', admin.updateUser);
adminRouter.patch('/users/:id/type', admin.updateUserType);

// Review Management
adminRouter.get('/reviews', admin.adminGetReviews);
adminRouter.patch('/reviews/:id', admin.updateReviewStatus);

// Enquiry Management
adminRouter.get('/enquiries', admin.adminGetEnquiries);

// Category Management
adminRouter.get('/categories', admin.getCategories);
adminRouter.post('/categories', admin.createCategory);
adminRouter.put('/categories/:id', admin.updateCategory);

// Ad Management
adminRouter.get('/ads', admin.adminGetAds);
adminRouter.post('/ads', admin.createAd);
adminRouter.put('/ads/:id', admin.updateAd);
adminRouter.delete('/ads/:id', admin.deleteAd);

// Blog Management
adminRouter.get('/blogs', admin.adminGetBlogs);
adminRouter.post('/blogs', admin.createBlog);
adminRouter.put('/blogs/:id', admin.updateBlog);
adminRouter.delete('/blogs/:id', admin.deleteBlog);

// Newsletter
adminRouter.get('/newsletter/subscribers', admin.adminGetSubscribers);

// Subscription Stats
adminRouter.get('/subscription/stats', admin.getSubscriptionStats);

router.use('/admin', adminRouter);

module.exports = router;