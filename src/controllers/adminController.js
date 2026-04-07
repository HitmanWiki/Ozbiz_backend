// backend/src/controllers/adminController.js
const prisma = require('../lib/prisma');
const slugify = require('slugify');
const emailSvc = require('../lib/email');

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [
      listingsTotal, listingsPending, listingsActive, listingsFeatured,
      usersTotal, usersVendor, usersConsumer,
      reviewsPending, enquiriesNew,
      recentListings, topCategories, recentEnquiries, monthlyListings,
    ] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'pending' } }),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.listing.count({ where: { isFeatured: true } }),
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({ where: { userType: 'vendor' } }),
      prisma.user.count({ where: { userType: 'consumer' } }),
      prisma.review.count({ where: { status: 'pending' } }),
      prisma.enquiry.count({ where: { status: 'new' } }),
      prisma.listing.findMany({
        take: 8, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true, status: true, city: true, createdAt: true, category: { select: { name: true } }, user: { select: { name: true } } },
      }),
      prisma.category.findMany({
        where: { isActive: true }, orderBy: { listingCount: 'desc' }, take: 8,
        select: { name: true, slug: true, icon: true, listingCount: true },
      }),
      prisma.enquiry.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, senderName: true, senderEmail: true, message: true, status: true, createdAt: true, listing: { select: { title: true } } },
      }),
      prisma.$queryRaw`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
               DATE_TRUNC('month', created_at) as month_date,
               COUNT(*)::int as count
        FROM listings
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month, month_date ORDER BY month_date
      `,
    ]);

    res.json({
      stats: {
        listings: { total: listingsTotal, pending: listingsPending, active: listingsActive, featured: listingsFeatured },
        users: { total: usersTotal, vendors: usersVendor, consumers: usersConsumer },
        reviews: { pending: reviewsPending },
        enquiries: { new: enquiriesNew },
      },
      recentListings,
      topCategories,
      recentEnquiries,
      monthlyListings: monthlyListings || [],
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/admin/listings
const adminGetListings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, category } = req.query;
    const take = parseInt(limit), skip = (parseInt(page) - 1) * take;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (category) where.category = { slug: category };

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, slug: true, status: true, isFeatured: true, isVerified: true,
          plan: true, city: true, state: true, phone: true, email: true, viewCount: true, ratingAvg: true, createdAt: true,
          category: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    res.json({ data: listings, pagination: { total, page: parseInt(page), limit: take } });
  } catch (err) {
    console.error('Admin get listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

// PATCH /api/admin/listings/:id/status
const updateListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isFeatured, isVerified, plan } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;
    if (isVerified !== undefined) data.isVerified = isVerified;
    if (plan !== undefined) data.plan = plan;

    const listing = await prisma.listing.update({
      where: { id }, data,
      include: { user: { select: { name: true, email: true } } },
    });

    if (listing.categoryId) {
      const count = await prisma.listing.count({ where: { categoryId: listing.categoryId, status: 'active' } });
      await prisma.category.update({ where: { id: listing.categoryId }, data: { listingCount: count } });
    }

    if (listing.user?.email && status === 'active') {
      emailSvc.sendListingApproved({ to: listing.user.email, name: listing.user.name, listingTitle: listing.title, listingSlug: listing.slug }).catch(console.error);
    } else if (listing.user?.email && status === 'rejected') {
      emailSvc.sendListingRejected({ to: listing.user.email, name: listing.user.name, listingTitle: listing.title, reason: req.body.reason }).catch(console.error);
    }

    res.json(listing);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Listing not found' });
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// GET /api/admin/users
const adminGetUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, userType } = req.query;
    const take = parseInt(limit), skip = (parseInt(page) - 1) * take;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } }, 
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (userType && userType !== 'all') {
      where.userType = userType;
    }
    
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ 
        where, 
        skip, 
        take, 
        orderBy: { createdAt: 'desc' }, 
        select: { 
          id: true, name: true, email: true, role: true, userType: true,
          phone: true, isActive: true, emailVerified: true, provider: true,
          businessName: true, subscriptionPlan: true, createdAt: true,
          _count: { select: { listings: true } } 
        } 
      }),
    ]);
    res.json({ 
      data: users.map(u => ({ ...u, listing_count: u._count.listings })), 
      pagination: { total, page: parseInt(page), limit: take } 
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// PATCH /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role, userType } = req.body;
    const data = {};
    if (is_active !== undefined) data.isActive = is_active;
    if (role !== undefined) data.role = role;
    if (userType !== undefined && ['consumer', 'vendor', 'both'].includes(userType)) data.userType = userType;
    
    const user = await prisma.user.update({ 
      where: { id }, 
      data, 
      select: { id: true, name: true, email: true, role: true, userType: true, isActive: true } 
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// PATCH /api/admin/users/:id/type
const updateUserType = async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;
    
    if (!['consumer', 'vendor', 'both'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: { userType },
      select: { id: true, name: true, email: true, userType: true }
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user type' });
  }
};

// GET /api/admin/reviews
const adminGetReviews = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const take = parseInt(limit), skip = (parseInt(page) - 1) * take;
    const where = status !== 'all' ? { status } : {};
    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { listing: { select: { title: true, slug: true } } } }),
    ]);
    res.json({ data: reviews, pagination: { total } });
  } catch (err) {
    console.error('Admin get reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// PATCH /api/admin/reviews/:id
const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const review = await prisma.review.update({ where: { id }, data: { status } });
    const [ratingData] = await prisma.$queryRaw`
      SELECT COALESCE(AVG(rating),0)::float as avg, COUNT(*)::int as count
      FROM reviews WHERE listing_id = ${review.listingId} AND status = 'approved'
    `;
    await prisma.listing.update({ where: { id: review.listingId }, data: { ratingAvg: ratingData.avg, ratingCount: ratingData.count } });
    res.json({ message: 'Review updated' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Review not found' });
    res.status(500).json({ error: 'Failed to update review' });
  }
};

// GET /api/admin/enquiries
const adminGetEnquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const take = parseInt(limit), skip = (parseInt(page) - 1) * take;
    const where = status && status !== 'all' ? { status } : {};
    const [total, enquiries] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { listing: { select: { title: true } } } }),
    ]);
    res.json({ data: enquiries, pagination: { total } });
  } catch (err) {
    console.error('Admin get enquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// ── Categories ────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    res.json(await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }));
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, description, icon, parent_id, sort_order, imageUrl } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
    const cat = await prisma.category.create({ data: { name, slug, description, icon, imageUrl, parentId: parent_id ? parseInt(parent_id) : null, sortOrder: sort_order ? parseInt(sort_order) : 0 } });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, sort_order, is_active, imageUrl } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (sort_order !== undefined) data.sortOrder = parseInt(sort_order);
    if (is_active !== undefined) data.isActive = is_active;
    const cat = await prisma.category.update({ where: { id: parseInt(id) }, data });
    res.json(cat);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// ── Advertisements ────────────────────────────────────────
const getAds = async (req, res) => {
  try {
    const { placement } = req.query;
    const where = { isActive: true };
    if (placement) where.placement = placement;
    const now = new Date();
    where.OR = [{ startDate: null }, { startDate: { lte: now } }];
    const ads = await prisma.advertisement.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    res.json(ads);
  } catch (err) {
    console.error('Get ads error:', err);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

const adminGetAds = async (req, res) => {
  try {
    res.json(await prisma.advertisement.findMany({ orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }] }));
  } catch (err) {
    console.error('Admin get ads error:', err);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

const createAd = async (req, res) => {
  try {
    const ad = await prisma.advertisement.create({ data: req.body });
    res.status(201).json(ad);
  } catch (err) {
    console.error('Create ad error:', err);
    res.status(500).json({ error: 'Failed to create ad' });
  }
};

const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await prisma.advertisement.update({ where: { id: parseInt(id) }, data: req.body });
    res.json(ad);
  } catch (err) {
    console.error('Update ad error:', err);
    res.status(500).json({ error: 'Failed to update ad' });
  }
};

const deleteAd = async (req, res) => {
  try {
    await prisma.advertisement.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    console.error('Delete ad error:', err);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
};

const trackAdClick = async (req, res) => {
  try {
    const ad = await prisma.advertisement.update({ where: { id: parseInt(req.params.id) }, data: { clickCount: { increment: 1 } }, select: { linkUrl: true } });
    res.json({ linkUrl: ad.linkUrl });
  } catch (err) {
    console.error('Track ad click error:', err);
    res.status(500).json({ error: 'Failed to track click' });
  }
};

// ── Blog ─────────────────────────────────────────────────
const getPublicBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 9, tag } = req.query;
    const take = parseInt(limit), skip = (parseInt(page) - 1) * take;
    const where = { status: 'published' };
    if (tag) where.tags = { has: tag };
    const [total, blogs] = await Promise.all([
      prisma.blog.count({ where }),
      prisma.blog.findMany({ where, skip, take, orderBy: { publishedAt: 'desc' }, select: { id: true, title: true, slug: true, excerpt: true, coverUrl: true, tags: true, viewCount: true, publishedAt: true, author: { select: { name: true, avatarUrl: true } } } }),
    ]);
    res.json({ data: blogs, pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / take) } });
  } catch (err) {
    console.error('Get public blogs error:', err);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

const getPublicBlogBySlug = async (req, res) => {
  try {
    const blog = await prisma.blog.findFirst({ where: { slug: req.params.slug, status: 'published' }, include: { author: { select: { name: true, avatarUrl: true } } } });
    if (!blog) return res.status(404).json({ error: 'Blog post not found' });
    prisma.blog.update({ where: { id: blog.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    res.json(blog);
  } catch (err) {
    console.error('Get public blog by slug error:', err);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
};

const adminGetBlogs = async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } } } });
    res.json(blogs);
  } catch (err) {
    console.error('Admin get blogs error:', err);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

const createBlog = async (req, res) => {
  try {
    const { title, content, excerpt, coverUrl, tags, status } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    let slug = slugify(title, { lower: true, strict: true });
    const exists = await prisma.blog.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;
    const blog = await prisma.blog.create({
      data: { authorId: req.user.id, title, slug, content, excerpt, coverUrl, tags: tags || [], status: status || 'draft', publishedAt: status === 'published' ? new Date() : null },
    });
    res.status(201).json(blog);
  } catch (err) {
    console.error('Create blog error:', err);
    res.status(500).json({ error: 'Failed to create blog' });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, coverUrl, tags, status } = req.body;
    const existing = await prisma.blog.findUnique({ where: { id }, select: { status: true } });
    const blog = await prisma.blog.update({
      where: { id }, data: { title, content, excerpt, coverUrl, tags, status,
        publishedAt: status === 'published' && existing?.status !== 'published' ? new Date() : undefined },
    });
    res.json(blog);
  } catch (err) {
    console.error('Update blog error:', err);
    res.status(500).json({ error: 'Failed to update blog' });
  }
};

const deleteBlog = async (req, res) => {
  try {
    await prisma.blog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Blog deleted' });
  } catch (err) {
    console.error('Delete blog error:', err);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
};

// ── Newsletter ────────────────────────────────────────────
const subscribeNewsletter = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({ where: { email: email.toLowerCase() }, data: { isActive: true, confirmedAt: new Date() } });
      }
      return res.json({ message: 'You are already subscribed!' });
    }
    await prisma.newsletterSubscriber.create({ data: { email: email.toLowerCase(), name, confirmedAt: new Date() } });
    emailSvc.sendNewsletterWelcome({ to: email, name }).catch(console.error);
    res.status(201).json({ message: 'Successfully subscribed to the newsletter!' });
  } catch (err) {
    console.error('Subscribe newsletter error:', err);
    res.status(500).json({ error: 'Subscription failed' });
  }
};

const adminGetSubscribers = async (req, res) => {
  try {
    const [total, subs] = await Promise.all([
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
      prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    res.json({ data: subs, total });
  } catch (err) {
    console.error('Admin get subscribers error:', err);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
};

// ─── Subscription Stats ────────────────────────────────────
const getSubscriptionStats = async (req, res) => {
  try {
    const [free, basic, premium, featured, elite] = await Promise.all([
      prisma.user.count({ where: { subscriptionPlan: 'free' } }),
      prisma.user.count({ where: { subscriptionPlan: 'basic' } }),
      prisma.user.count({ where: { subscriptionPlan: 'premium' } }),
      prisma.user.count({ where: { subscriptionPlan: 'featured' } }),
      prisma.user.count({ where: { subscriptionPlan: 'elite' } })
    ]);
    
    const revenue = await prisma.subscriptionHistory?.aggregate({
      _sum: { amount: true },
      where: { status: 'active' }
    }).catch(() => ({ _sum: { amount: 0 } }));
    
    const recentTransactions = await prisma.subscriptionHistory?.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    }).catch(() => []);
    
    res.json({
      plans: { free, basic, premium, featured, elite },
      monthlyRevenue: revenue?._sum?.amount || 0,
      recentTransactions: recentTransactions || []
    });
  } catch (err) {
    console.error('Get subscription stats error:', err);
    res.json({ plans: { free: 0, basic: 0, premium: 0, featured: 0, elite: 0 }, monthlyRevenue: 0, recentTransactions: [] });
  }
};

// ─── Public helpers ────────────────────────────────────────
const publicCategories = async (req, res) => {
  try {
    res.json(await prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }));
  } catch (err) {
    console.error('Public categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const publicCities = async (req, res) => {
  try {
    const cities = await prisma.$queryRaw`
      SELECT city, state, COUNT(*)::int as count FROM listings
      WHERE status = 'active' AND city IS NOT NULL
      GROUP BY city, state ORDER BY count DESC LIMIT 20
    `;
    res.json(cities);
  } catch (err) {
    console.error('Public cities error:', err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

module.exports = {
  getDashboardStats,
  adminGetListings,
  updateListingStatus,
  adminGetUsers,
  updateUser,
  adminGetReviews,
  updateReviewStatus,
  adminGetEnquiries,
  getCategories,
  createCategory,
  updateCategory,
  getAds,
  adminGetAds,
  createAd,
  updateAd,
  deleteAd,
  trackAdClick,
  getPublicBlogs,
  getPublicBlogBySlug,
  adminGetBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  subscribeNewsletter,
  adminGetSubscribers,
  publicCategories,
  publicCities,
  updateUserType,
  getSubscriptionStats,
};