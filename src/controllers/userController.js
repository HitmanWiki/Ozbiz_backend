// backend/src/controllers/userController.js
const prisma = require('../lib/prisma');

// ─── Favorites ───────────────────────────────────────────────────
const getFavorites = async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: {
            category: true,
            images: { where: { type: 'logo' }, take: 1 },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(favorites);
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

const addFavorite = async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'Listing ID required' });

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId: listingId
        }
      }
    });

    if (existing) {
      return res.json({ message: 'Already in favorites', favorite: existing });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        listingId: listingId
      },
      include: { listing: true }
    });
    res.status(201).json(favorite);
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { listingId } = req.params;
    await prisma.favorite.delete({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId: listingId
        }
      }
    });
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

// ─── Enquiry History ────────────────────────────────────────────
const getEnquiryHistory = async (req, res) => {
  try {
    const enquiries = await prisma.enquiry.findMany({
      where: { senderEmail: req.user.email },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(enquiries);
  } catch (err) {
    console.error('Get enquiry history error:', err);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// ─── Search History ─────────────────────────────────────────────
const getSearchHistory = async (req, res) => {
  try {
    const searches = await prisma.searchHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { searchedAt: 'desc' },
      take: 20
    });
    res.json(searches);
  } catch (err) {
    console.error('Get search history error:', err);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
};

const saveSearchHistory = async (req, res) => {
  try {
    const { query, filters, resultsCount } = req.body;
    if (!query) return res.status(400).json({ error: 'Search query required' });

    const count = await prisma.searchHistory.count({ where: { userId: req.user.id } });
    if (count >= 50) {
      const oldest = await prisma.searchHistory.findFirst({
        where: { userId: req.user.id },
        orderBy: { searchedAt: 'asc' }
      });
      if (oldest) await prisma.searchHistory.delete({ where: { id: oldest.id } });
    }

    const search = await prisma.searchHistory.create({
      data: {
        userId: req.user.id,
        query: query,
        filters: filters || {},
        resultsCount: resultsCount || 0
      }
    });
    res.status(201).json(search);
  } catch (err) {
    console.error('Save search error:', err);
    res.status(500).json({ error: 'Failed to save search' });
  }
};

const clearSearchHistory = async (req, res) => {
  try {
    await prisma.searchHistory.deleteMany({
      where: { userId: req.user.id }
    });
    res.json({ message: 'Search history cleared' });
  } catch (err) {
    console.error('Clear search history error:', err);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
};

// ─── Notification Settings ──────────────────────────────────────
const getNotificationSettings = async (req, res) => {
  try {
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId: req.user.id }
    });
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId: req.user.id,
          emailEnquiries: true,
          emailReviews: true,
          emailNewsletter: req.user.newsletterSubscribed || false,
          emailPromotions: false,
          emailLeadUpdates: true,
          pushEnquiries: true,
          pushReviews: true,
          pushLeadUpdates: true
        }
      });
    }
    res.json(settings);
  } catch (err) {
    console.error('Get notification settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { userId: req.user.id },
      update: req.body,
      create: {
        userId: req.user.id,
        ...req.body
      }
    });
    res.json(settings);
  } catch (err) {
    console.error('Update notification settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// ─── Notifications ──────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.json([]);
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// ─── Vendor Dashboard Stats ─────────────────────────────────────
const getVendorDashboardStats = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { subscriptionPlan: true, subscriptionExpiresAt: true }
    });

    const [listings, totalViews, totalLeads, recentLeads, reviews] = await Promise.all([
      prisma.listing.findMany({
        where: { userId: req.user.id },
        select: { 
          id: true, title: true, slug: true, viewCount: true, 
          leadCount: true, status: true, ratingAvg: true, 
          ratingCount: true, createdAt: true 
        }
      }),
      prisma.listing.aggregate({
        where: { userId: req.user.id },
        _sum: { viewCount: true }
      }),
      prisma.enquiry.count({
        where: { listing: { userId: req.user.id } }
      }),
      prisma.enquiry.findMany({
        where: { listing: { userId: req.user.id } },
        include: { listing: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.review.findMany({
        where: { listing: { userId: req.user.id }, status: 'approved' },
        include: { listing: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate average rating
    const avgRating = listings.reduce((sum, l) => sum + Number(l.ratingAvg), 0) / (listings.length || 1);
    
    // Calculate conversion rate
    const totalViewCount = totalViews._sum.viewCount || 0;
    const conversionRate = totalLeads > 0 && totalViewCount > 0 
      ? Math.round((totalLeads / totalViewCount) * 100) 
      : 0;

    // Get monthly view trend (last 6 months)
    let monthlyViews = [];
    try {
      monthlyViews = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
          DATE_TRUNC('month', created_at) as month_date,
          COUNT(*)::int as views
        FROM listings
        WHERE user_id = ${req.user.id}
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `;
    } catch (err) {
      console.error('Error fetching monthly views:', err);
      monthlyViews = [];
    }

    // Get leads trend (last 6 months)
    let leadsTrend = [];
    try {
      leadsTrend = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
          COUNT(*)::int as leads
        FROM enquiries
        WHERE listing_id IN (SELECT id FROM listings WHERE user_id = ${req.user.id})
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `;
    } catch (err) {
      console.error('Error fetching leads trend:', err);
      leadsTrend = [];
    }

    res.json({
      stats: {
        totalListings: listings.length,
        totalViews: totalViewCount,
        totalLeads: totalLeads,
        activeListings: listings.filter(l => l.status === 'active').length,
        pendingListings: listings.filter(l => l.status === 'pending').length,
        averageRating: parseFloat(avgRating.toFixed(1)),
        conversionRate: conversionRate,
        subscriptionPlan: user?.subscriptionPlan || 'free',
        subscriptionActive: user?.subscriptionExpiresAt 
          ? new Date(user.subscriptionExpiresAt) > new Date()
          : true
      },
      listings,
      recentLeads,
      recentReviews: reviews,
      monthlyViews: monthlyViews || [],
      leadsTrend: leadsTrend || []
    });
  } catch (err) {
    console.error('Vendor dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// ─── Lead Management ────────────────────────────────────────────
const getLeads = async (req, res) => {
  try {
    const { status, leadStatus, page = 1, limit = 20 } = req.query;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    
    const where = {
      listing: { userId: req.user.id }
    };
    if (status && status !== 'all') where.status = status;
    if (leadStatus && leadStatus !== 'all') where.leadStatus = leadStatus;

    const [total, leads] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        include: { 
          listing: { select: { id: true, title: true, slug: true } } 
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({ 
      data: leads, 
      pagination: { 
        total, 
        page: parseInt(page), 
        limit: take, 
        totalPages: Math.ceil(total / take) 
      } 
    });
  } catch (err) {
    console.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

const updateLeadStatus = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { status, leadStatus } = req.body;
    
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (leadStatus !== undefined) updateData.leadStatus = leadStatus;
    
    const enquiry = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData
    });
    res.json(enquiry);
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

// ─── Review Management ──────────────────────────────────────────
const getVendorReviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;
    
    const where = {
      listing: { userId: req.user.id }
    };
    if (status && status !== 'all') where.status = status;

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: { listing: { select: { id: true, title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({ 
      data: reviews, 
      pagination: { 
        total, 
        page: parseInt(page), 
        limit: take, 
        totalPages: Math.ceil(total / take) 
      } 
    });
  } catch (err) {
    console.error('Get vendor reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    
    if (!reply) return res.status(400).json({ error: 'Reply message is required' });
    
    const review = await prisma.review.findFirst({
      where: { 
        id: reviewId,
        listing: { userId: req.user.id }
      },
      include: { listing: { select: { title: true } } }
    });
    
    if (!review) return res.status(404).json({ error: 'Review not found' });
    
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { 
        vendorReply: reply,
        vendorReplyAt: new Date()
      }
    });
    
    res.json({ message: 'Reply posted successfully', review: updated });
  } catch (err) {
    console.error('Reply to review error:', err);
    res.status(500).json({ error: 'Failed to post reply' });
  }
};

const flagReviewAsSpam = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    const review = await prisma.review.findFirst({
      where: { 
        id: reviewId,
        listing: { userId: req.user.id }
      }
    });
    
    if (!review) return res.status(404).json({ error: 'Review not found' });
    
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'flagged' }
    });
    
    res.json({ message: 'Review flagged as spam', review: updated });
  } catch (err) {
    console.error('Flag review error:', err);
    res.status(500).json({ error: 'Failed to flag review' });
  }
};

// ─── Subscription Management ────────────────────────────────────
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        period: 'month',
        features: [
          '1 Active Listing',
          'Basic Listing Features',
          'Email Support',
          'Basic Analytics',
          'Standard Visibility'
        ],
        limits: {
          listings: 1,
          views: 1000,
          leads: 10
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 29,
        period: 'month',
        features: [
          '5 Active Listings',
          'Premium Listing Features',
          'Priority Email Support',
          'Advanced Analytics',
          'Increased Visibility',
          'Featured on Homepage',
          'Verified Badge'
        ],
        limits: {
          listings: 5,
          views: 10000,
          leads: 100
        }
      },
      {
        id: 'elite',
        name: 'Elite',
        price: 79,
        period: 'month',
        features: [
          'Unlimited Listings',
          'Elite Listing Features',
          '24/7 Priority Support',
          'Full Analytics Suite',
          'Maximum Visibility',
          'Featured + Top Placement',
          'Verified + Trust Badge',
          'Sponsored Placement',
          'Dedicated Account Manager'
        ],
        limits: {
          listings: -1,
          views: -1,
          leads: -1
        }
      }
    ];
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { subscriptionPlan: true, subscriptionExpiresAt: true }
    });
    
    res.json({
      plans,
      currentPlan: user?.subscriptionPlan || 'free',
      expiresAt: user?.subscriptionExpiresAt
    });
  } catch (err) {
    console.error('Get subscription plans error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
};

const upgradeSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!['free', 'premium', 'elite'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        subscriptionPlan: planId,
        subscriptionExpiresAt: expiresAt
      }
    });
    
    res.json({ 
      message: `Successfully upgraded to ${planId} plan`,
      subscriptionPlan: user.subscriptionPlan,
      expiresAt: user.subscriptionExpiresAt
    });
  } catch (err) {
    console.error('Upgrade subscription error:', err);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        subscriptionPlan: 'free',
        subscriptionExpiresAt: null
      }
    });
    
    res.json({ 
      message: 'Subscription cancelled',
      subscriptionPlan: user.subscriptionPlan
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// ─── Analytics ───────────────────────────────────────────────────
const getListingAnalytics = async (req, res) => {
  try {
    const { listingId } = req.params;
    
    const listing = await prisma.listing.findFirst({
      where: { 
        id: listingId,
        userId: req.user.id
      },
      include: {
        products: { where: { isFeatured: true } }
      }
    });
    
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    res.json({
      listing: {
        id: listing.id,
        title: listing.title,
        viewCount: listing.viewCount,
        leadCount: listing.leadCount,
        ratingAvg: listing.ratingAvg
      },
      products: listing.products
    });
  } catch (err) {
    console.error('Get listing analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Module exports
module.exports = {
  // Consumer features
  getFavorites,
  addFavorite,
  removeFavorite,
  getEnquiryHistory,
  getSearchHistory,
  saveSearchHistory,
  clearSearchHistory,
  getNotificationSettings,
  updateNotificationSettings,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Vendor features
  getVendorDashboardStats,
  getLeads,
  updateLeadStatus,
  getVendorReviews,
  replyToReview,
  flagReviewAsSpam,
  
  // Subscription features
  getSubscriptionPlans,
  upgradeSubscription,
  cancelSubscription,
  
  // Analytics
  getListingAnalytics,
};