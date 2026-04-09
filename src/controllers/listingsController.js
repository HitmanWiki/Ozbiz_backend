// backend/src/controllers/listingsController.js
const prisma = require('../lib/prisma');
const slugify = require('slugify');
const { uploadToCloud } = require('../middleware/upload');
const emailSvc = require('../lib/email');

const getListings = async (req, res) => {
  try {
    const { 
      search, category, city, state, featured, 
      page = 1, limit = 12, sort = 'createdAt',
      priceRange, verifiedOnly, openNow, minRating 
    } = req.query;
    
    const take = Math.min(parseInt(limit), 50);
    const skip = (parseInt(page) - 1) * take;

    const where = { status: 'active' };
    
    // Search filter
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { suburb: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }
    
    // Category filter
    if (category) {
      where.category = { slug: category };
    }
    
    // Location filters
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }
    if (state) {
      where.state = { equals: state, mode: 'insensitive' };
    }
    
    // Featured filter
    if (featured === 'true') {
      where.isFeatured = true;
    }
    
    // Price range filter (based on plan)
    if (priceRange) {
      if (priceRange === '$') where.plan = 'free';
      else if (priceRange === '$$') where.plan = 'basic';
      else if (priceRange === '$$$') where.plan = 'premium';
      else if (priceRange === '$$$$') where.plan = 'elite';
    }
    
    // Verified only filter
    if (verifiedOnly === 'true') {
      where.isVerified = true;
    }
    
    // Minimum rating filter
    if (minRating && !isNaN(parseFloat(minRating))) {
      where.ratingAvg = { gte: parseFloat(minRating) };
    }

    const orderByMap = {
      createdAt: { createdAt: 'desc' },
      rating: { ratingAvg: 'desc' },
      views: { viewCount: 'desc' },
      name: { title: 'asc' },
      relevance: { createdAt: 'desc' }
    };

    // First, get all listings matching basic filters
    let listings = await prisma.listing.findMany({
      where,
      skip,
      take,
      orderBy: [{ isFeatured: 'desc' }, orderByMap[sort] || { createdAt: 'desc' }],
      select: {
        id: true, title: true, slug: true, shortDescription: true,
        phone: true, email: true, website: true,
        address: true, suburb: true, city: true, state: true, postcode: true,
        logoUrl: true, coverUrl: true,
        isFeatured: true, isVerified: true,
        plan: true, ratingAvg: true, ratingCount: true, viewCount: true,
        tags: true, status: true, createdAt: true,
        businessHours: true,
        category: { select: { name: true, slug: true, icon: true } },
        images: { where: { type: 'banner' }, take: 1, select: { url: true } },
      },
    });

    // Get total count before open now filter
    const total = await prisma.listing.count({ where });
    
    // Apply open now filter (post-processing for complex business hours)
    if (openNow === 'true') {
      listings = listings.filter(listing => {
        if (!listing.businessHours) return false;
        try {
          const hours = typeof listing.businessHours === 'string' 
            ? JSON.parse(listing.businessHours) 
            : listing.businessHours;
          
          const now = new Date();
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = days[now.getDay()];
          const dayHours = hours[currentDay];
          
          if (!dayHours || dayHours === 'Closed') return false;
          
          const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
          const [openTime, closeTime] = dayHours.split('-').map(t => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + (m || 0);
          });
          return currentTimeMinutes >= openTime && currentTimeMinutes <= closeTime;
        } catch (e) {
          return false;
        }
      });
    }

    // Transform the data to ensure coverUrl is always available
    const transformedListings = listings.map(listing => ({
      ...listing,
      coverUrl: listing.coverUrl || listing.images?.[0]?.url || null,
      logoUrl: listing.logoUrl || null,
      businessHours: typeof listing.businessHours === 'string' 
        ? JSON.parse(listing.businessHours) 
        : listing.businessHours,
    }));

    res.json({ 
      data: transformedListings, 
      pagination: { 
        total: openNow === 'true' ? listings.length : total, 
        page: parseInt(page), 
        limit: take, 
        totalPages: Math.ceil((openNow === 'true' ? listings.length : total) / take) 
      } 
    });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

// GET /api/listings/my
const getMyListings = async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        _count: { select: { enquiries: true, reviews: true } },
      },
    });
    res.json(listings);
  } catch (err) {
    console.error('Get my listings error:', err);
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
};

const getListingBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const listing = await prisma.listing.findFirst({
      where: { slug, status: { in: ['active', 'featured'] } },
      include: {
        category: { select: { name: true, slug: true, icon: true } },
        user: { select: { name: true, email: true } },
        images: { 
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] 
        },
        products: { 
          where: { isAvailable: true }, 
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }] 
        },
        reviews: {
          where: { status: 'approved' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // Increment view count (non-blocking)
    prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    // Ensure coverUrl and logoUrl are set
    const response = {
      ...listing,
      coverUrl: listing.coverUrl || listing.images?.find(i => i.type === 'cover' || i.type === 'banner')?.url || null,
      logoUrl: listing.logoUrl || listing.images?.find(i => i.type === 'logo')?.url || null,
      businessHours: typeof listing.businessHours === 'string' 
        ? JSON.parse(listing.businessHours) 
        : listing.businessHours,
    };

    res.json(response);
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
};

// POST /api/listings
const createListing = async (req, res) => {
  try {
    const {
      title, category_id, description, shortDescription,
      phone, email, website, address, suburb, city, state, postcode, abn,
      businessHours, tags,
      socialFacebook, socialInstagram, socialTwitter, socialLinkedin, socialYoutube, socialWhatsapp,
    } = req.body;

    if (!title || !category_id)
      return res.status(400).json({ error: 'Title and category are required' });

    let slug = slugify(title, { lower: true, strict: true });
    const exists = await prisma.listing.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const listing = await prisma.listing.create({
      data: {
        userId: req.user.id, categoryId: parseInt(category_id),
        title: title.trim(), slug, description, shortDescription,
        phone, email, website, address, suburb, city, state, postcode, abn,
        businessHours: businessHours ? JSON.stringify(businessHours) : undefined,
        tags: Array.isArray(tags) ? tags : tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        socialFacebook, socialInstagram, socialTwitter, socialLinkedin, socialYoutube, socialWhatsapp,
        status: 'pending',
      },
    });

    // Send emails (non-blocking)
    const owner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true } });
    emailSvc.sendListingSubmitted({ to: owner.email, name: owner.name, listingTitle: title }).catch(console.error);
    if (process.env.ADMIN_EMAIL) {
      emailSvc.sendNewListingAlert({
        to: process.env.ADMIN_EMAIL, listingTitle: title,
        ownerName: owner.name, ownerEmail: owner.email, city,
      }).catch(console.error);
    }

    res.status(201).json(listing);
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

// PUT /api/listings/:id
const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const existing = await prisma.listing.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (!isAdmin && existing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const {
      title, category_id, description, shortDescription,
      phone, email, website, address, suburb, city, state, postcode, abn,
      businessHours, tags,
      socialFacebook, socialInstagram, socialTwitter, socialLinkedin, socialYoutube, socialWhatsapp,
      logoUrl, coverUrl,
      status, isFeatured, isVerified, plan,
    } = req.body;

    const data = {};
    const set = (k, v) => { if (v !== undefined) data[k] = v; };
    set('title', title); set('categoryId', category_id ? parseInt(category_id) : undefined);
    set('description', description); set('shortDescription', shortDescription);
    set('phone', phone); set('email', email); set('website', website);
    set('address', address); set('suburb', suburb); set('city', city);
    set('state', state); set('postcode', postcode); set('abn', abn);
    set('businessHours', businessHours ? JSON.stringify(businessHours) : undefined);
    set('logoUrl', logoUrl); set('coverUrl', coverUrl);
    set('socialFacebook', socialFacebook); set('socialInstagram', socialInstagram);
    set('socialTwitter', socialTwitter); set('socialLinkedin', socialLinkedin);
    set('socialYoutube', socialYoutube); set('socialWhatsapp', socialWhatsapp);
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
    if (isAdmin) { set('status', status); set('isFeatured', isFeatured); set('isVerified', isVerified); set('plan', plan); }

    const updated = await prisma.listing.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// DELETE /api/listings/:id
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const existing = await prisma.listing.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (!isAdmin && existing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });
    await prisma.listing.delete({ where: { id } });
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
};

// POST /api/listings/:id/images
const addListingImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'gallery', caption, sortOrder = 0 } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id }, select: { userId: true, title: true } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const url = await uploadToCloud(req.file.path, 'ozbiz/listings');
    
    const image = await prisma.listingImage.create({
      data: { listingId: id, url, type, caption, sortOrder: parseInt(sortOrder) },
    });

    if (type === 'logo') {
      await prisma.listing.update({ where: { id }, data: { logoUrl: url } });
    }
    if (type === 'cover' || type === 'banner') {
      await prisma.listing.update({ where: { id }, data: { coverUrl: url } });
    }

    const updatedListing = await prisma.listing.findUnique({
      where: { id },
      select: { logoUrl: true, coverUrl: true, images: true }
    });

    res.status(201).json({ image, listing: updatedListing });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
};

// DELETE /api/listings/:id/images/:imageId
const deleteListingImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const img = await prisma.listingImage.findFirst({
      where: { id: parseInt(imageId), listingId: id },
      include: { listing: { select: { userId: true } } },
    });
    if (!img) return res.status(404).json({ error: 'Image not found' });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && img.listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });
    await prisma.listingImage.delete({ where: { id: parseInt(imageId) } });
    res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

// POST /api/listings/:id/products
const addProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, priceUnit, imageUrl, isAvailable, isFeatured, sortOrder, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const listing = await prisma.listing.findUnique({ where: { id }, select: { userId: true } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const product = await prisma.product.create({
      data: {
        listingId: id, name, description,
        price: price ? parseFloat(price) : null,
        priceUnit, imageUrl,
        isAvailable: isAvailable !== false,
        isFeatured: isFeatured === true,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        category,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
};

// PUT /api/listings/:id/products/:productId
const updateProduct = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const prod = await prisma.product.findFirst({
      where: { id: productId, listingId: id },
      include: { listing: { select: { userId: true } } },
    });
    if (!prod) return res.status(404).json({ error: 'Product not found' });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && prod.listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const { name, description, price, priceUnit, imageUrl, isAvailable, isFeatured, sortOrder, category } = req.body;
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name }), ...(description !== undefined && { description }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(priceUnit !== undefined && { priceUnit }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(category !== undefined && { category }),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// DELETE /api/listings/:id/products/:productId
const deleteProduct = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const prod = await prisma.product.findFirst({
      where: { id: productId, listingId: id },
      include: { listing: { select: { userId: true } } },
    });
    if (!prod) return res.status(404).json({ error: 'Product not found' });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && prod.listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });
    await prisma.product.delete({ where: { id: productId } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// POST /api/listings/:id/enquiry
const sendEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { sender_name, sender_email, sender_phone, subject, message } = req.body;
    if (!sender_name || !sender_email || !message)
      return res.status(400).json({ error: 'Name, email and message are required' });

    const listing = await prisma.listing.findUnique({
      where: { id }, 
      select: { title: true, email: true, userId: true, leadCount: true }
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    await prisma.enquiry.create({
      data: { listingId: id, senderName: sender_name, senderEmail: sender_email, senderPhone: sender_phone, subject, message },
    });
    
    await prisma.listing.update({ where: { id }, data: { leadCount: { increment: 1 } } });
    prisma.listing.update({ where: { id }, data: { clickCount: { increment: 1 } } }).catch(() => {});

    // Email to business owner
    if (listing.email || listing.userId) {
      const ownerEmail = listing.email || (await prisma.user.findUnique({ where: { id: listing.userId }, select: { email: true, name: true } }));
      const toEmail = listing.email || ownerEmail?.email;
      const ownerName = ownerEmail?.name || 'Business Owner';
      if (toEmail) {
        emailSvc.sendEnquiryReceived({
          to: toEmail, ownerName, listingTitle: listing.title,
          senderName: sender_name, senderEmail: sender_email,
          senderPhone: sender_phone, subject, message,
        }).catch(console.error);
      }
    }
    emailSvc.sendEnquiryConfirmation({ to: sender_email, senderName: sender_name, listingTitle: listing.title }).catch(console.error);

    res.status(201).json({ message: 'Enquiry sent successfully' });
  } catch (err) {
    console.error('Enquiry error:', err);
    res.status(500).json({ error: 'Failed to send enquiry' });
  }
};

// POST /api/reviews/:reviewId/helpful
const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } }
    });
    res.json({ message: 'Marked as helpful', helpfulCount: review.helpfulCount });
  } catch (err) {
    console.error('Mark helpful error:', err);
    res.status(500).json({ error: 'Failed to mark as helpful' });
  }
};

// POST /api/listings/:id/reviews
const submitReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, body, reviewer_name, reviewer_email } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Rating between 1-5 is required' });

    const listing = await prisma.listing.findUnique({ where: { id }, select: { title: true } });
    await prisma.review.create({
      data: { listingId: id, reviewerName: reviewer_name, reviewerEmail: reviewer_email, rating: parseInt(rating), title, body, status: 'pending' },
    });

    if (process.env.ADMIN_EMAIL) {
      emailSvc.sendReviewAlert({ to: process.env.ADMIN_EMAIL, listingTitle: listing?.title, reviewerName: reviewer_name, rating }).catch(console.error);
    }

    res.status(201).json({ message: 'Review submitted for moderation' });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// GET /api/listings/:id/enquiries
const getListingEnquiries = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({ where: { id }, select: { userId: true } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const enquiries = await prisma.enquiry.findMany({
      where: { listingId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(enquiries);
  } catch (err) {
    console.error('Get listing enquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// POST /api/enquiries/:enquiryId/reply
const replyToEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Reply message is required' });

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: { listing: { select: { title: true, userId: true } } },
    });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && enquiry.listing.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: { replyMessage: message, repliedAt: new Date(), status: 'replied' },
    });

    emailSvc.sendEnquiryReply({
      to: enquiry.senderEmail, senderName: enquiry.senderName,
      listingTitle: enquiry.listing.title, replyMessage: message,
    }).catch(console.error);

    res.json({ message: 'Reply sent successfully' });
  } catch (err) {
    console.error('Reply enquiry error:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};

// GET /api/homepage/featured-products
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isFeatured: true, isAvailable: true, listing: { status: 'active' } },
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { title: true, slug: true, city: true, logoUrl: true, category: { select: { name: true } } } },
      },
    });
    res.json(products);
  } catch (err) {
    console.error('Get featured products error:', err);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
};

// GET /api/listings/id/:id
const getListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        products: true,
      },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    const isOwner = listing.userId === req.user?.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user?.role);
    
    if (!isOwner && !isAdmin && req.user) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    res.json(listing);
  } catch (err) {
    console.error('Get listing by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
};

// GET /api/homepage/most-visited
const getMostVisited = async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: 'active' },
      orderBy: { viewCount: 'desc' },
      take: 8,
      select: {
        id: true, title: true, slug: true, shortDescription: true,
        logoUrl: true, coverUrl: true,
        city: true, state: true,
        viewCount: true, ratingAvg: true, ratingCount: true,
        isFeatured: true, isVerified: true,
        category: { select: { name: true, slug: true, icon: true } },
      },
    });
    res.json(listings);
  } catch (err) {
    console.error('Get most visited error:', err);
    res.status(500).json({ error: 'Failed to fetch most visited' });
  }
};

module.exports = {
  getListings,
  getMyListings,
  getListingBySlug,
  createListing,
  updateListing,
  deleteListing,
  addListingImage,
  deleteListingImage,
  addProduct,
  updateProduct,
  deleteProduct,
  sendEnquiry,
  submitReview,
  getListingEnquiries,
  replyToEnquiry,
  getFeaturedProducts,
  getMostVisited,
  markHelpful,
  getListingById,
};