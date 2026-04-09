// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Categories
const categories = [
  { name: 'Restaurants & Cafes', slug: 'restaurants-cafes', icon: 'utensils', description: 'Restaurants, cafes, food courts and dining experiences' },
  { name: 'Health & Medical', slug: 'health-medical', icon: 'heart-pulse', description: 'Doctors, dentists, hospitals and health services' },
  { name: 'Education & Training', slug: 'education-training', icon: 'graduation-cap', description: 'Schools, tutors, language classes and training courses' },
  { name: 'Professional Services', slug: 'professional-services', icon: 'briefcase', description: 'Lawyers, accountants, consultants and business services' },
  { name: 'Trade Services', slug: 'trade-services', icon: 'wrench', description: 'Electricians, plumbers, builders and tradespeople' },
  { name: 'Beauty & Wellness', slug: 'beauty-wellness', icon: 'sparkles', description: 'Hair salons, beauty therapists, massage and wellness' },
  { name: 'Automotive', slug: 'automotive', icon: 'car', description: 'Car dealers, mechanics, smash repairs and automotive services' },
  { name: 'Real Estate', slug: 'real-estate', icon: 'home', description: 'Real estate agents, property managers and mortgage brokers' },
  { name: 'Financial Services', slug: 'financial-services', icon: 'landmark', description: 'Accountants, financial planners, insurance and banking' },
  { name: 'IT & Technology', slug: 'it-technology', icon: 'monitor', description: 'IT support, web design, software and tech services' },
  { name: 'Events & Entertainment', slug: 'events-entertainment', icon: 'party-popper', description: 'Event planning, photographers, DJs and entertainment' },
  { name: 'Travel & Transport', slug: 'travel-transport', icon: 'plane', description: 'Travel agents, taxis, removalists and transport services' },
  { name: 'Retail & Shopping', slug: 'retail-shopping', icon: 'shopping-bag', description: 'Clothing, grocery stores, jewellery and retail shops' },
  { name: 'Religion & Spirituality', slug: 'religion-spirituality', icon: 'star', description: 'Temples, churches, gurdwaras and spiritual services' },
  { name: 'Domestic Services', slug: 'domestic-services', icon: 'home-heart', description: 'Cleaning, gardening, childcare and home services' },
  { name: 'Migration & Visa', slug: 'migration-visa', icon: 'globe', description: 'Migration agents, visa consultants and immigration lawyers' },
];

// Complete listings with all details
const listingsData = [
  {
    slug: 'spice-route-indian-restaurant',
    title: 'Spice Route Indian Restaurant',
    category: 'restaurants-cafes',
    city: 'Melbourne',
    description: `Spice Route is Melbourne's premier destination for authentic Indian cuisine. Located in the heart of Melbourne CBD, we bring the rich flavors and aromatic spices of India to your plate.`,
    shortDescription: 'Authentic Indian cuisine in Melbourne CBD. Award-winning butter chicken and biryani. Dine-in, takeaway & delivery.',
    phone: '03 9123 4567',
    email: 'info@spiceroute.com.au',
    website: 'https://spiceroute.com.au',
    address: '123 Swanston Street',
    suburb: 'Melbourne CBD',
    state: 'VIC',
    postcode: '3000',
    status: 'active',
    isFeatured: true,
    isVerified: true,
    plan: 'featured',
    ratingAvg: 4.8,
    ratingCount: 127,
    viewCount: 3450,
    leadCount: 45,
    tags: ['indian food', 'curry', 'tandoor', 'vegetarian', 'halal', 'biryani'],
    businessHours: JSON.stringify({
      monday: '11:30-22:00',
      tuesday: '11:30-22:00',
      wednesday: '11:30-22:00',
      thursday: '11:30-22:00',
      friday: '11:30-23:00',
      saturday: '11:30-23:00',
      sunday: '12:00-21:30'
    }),
    logoUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=400&fit=crop',
    socialFacebook: 'https://facebook.com/spiceroute',
    socialInstagram: 'https://instagram.com/spiceroute',
    ownerEmail: 'raj@example.com'  // Assign to Raj
  },
  {
    slug: 'punjabi-tandoor',
    title: 'Punjabi Tandoor Restaurant',
    category: 'restaurants-cafes',
    city: 'Sydney',
    description: `Experience the true flavors of Punjab at Punjabi Tandoor. Our family-run restaurant brings you authentic Punjabi cuisine made with love and tradition.`,
    shortDescription: 'Authentic Punjabi cuisine in Sydney. Famous for tandoori chicken, dal makhani, and freshly baked naan.',
    phone: '02 9876 5432',
    email: 'info@punjabitandoor.com.au',
    website: 'https://punjabitandoor.com.au',
    address: '78 Harris Street',
    suburb: 'Harris Park',
    state: 'NSW',
    postcode: '2150',
    status: 'active',
    isFeatured: true,
    plan: 'basic',
    ratingAvg: 4.7,
    ratingCount: 89,
    viewCount: 1890,
    leadCount: 56,
    tags: ['punjabi food', 'tandoori', 'north indian', 'family restaurant', 'halal'],
    businessHours: JSON.stringify({
      monday: '17:00-22:30',
      tuesday: '17:00-22:30',
      wednesday: '17:00-22:30',
      thursday: '17:00-22:30',
      friday: '12:00-23:00',
      saturday: '12:00-23:00',
      sunday: '12:00-22:00'
    }),
    logoUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&h=400&fit=crop',
    ownerEmail: 'harpreet@singhlaw.com.au'  // Assign to Harpreet
  },
  {
    slug: 'singh-associates-migration-lawyers',
    title: 'Singh & Associates Migration Lawyers',
    category: 'migration-visa',
    city: 'Sydney',
    description: `Singh & Associates is a leading migration law firm with over 15 years of experience helping Indian professionals and families achieve their Australian dream.`,
    shortDescription: 'MARA-registered migration agents specializing in skilled, family, and employer-sponsored visas for Indian professionals.',
    phone: '02 8234 5678',
    email: 'info@singhlaw.com.au',
    website: 'https://singhlaw.com.au',
    address: 'Level 12, 45 George Street',
    suburb: 'Sydney CBD',
    state: 'NSW',
    postcode: '2000',
    status: 'active',
    isFeatured: true,
    isVerified: true,
    plan: 'elite',
    ratingAvg: 4.9,
    ratingCount: 89,
    viewCount: 2150,
    leadCount: 78,
    tags: ['migration', 'visa', 'immigration lawyer', 'MARA', 'skilled visa', 'PR'],
    businessHours: JSON.stringify({
      monday: '09:00-18:00',
      tuesday: '09:00-18:00',
      wednesday: '09:00-18:00',
      thursday: '09:00-18:00',
      friday: '09:00-17:00',
      saturday: '10:00-14:00',
      sunday: 'Closed'
    }),
    logoUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop',
    socialFacebook: 'https://facebook.com/singhlaw',
    socialLinkedin: 'https://linkedin.com/company/singh-associates',
    ownerEmail: 'harpreet@singhlaw.com.au'  // Assign to Harpreet
  },
  {
    slug: 'rajs-accounting-tax-services',
    title: "Raj's Accounting & Tax Services",
    category: 'financial-services',
    city: 'Brisbane',
    description: `Raj's Accounting provides comprehensive accounting, tax, and business advisory services tailored for small businesses, sole traders, and individuals.`,
    shortDescription: 'Tax returns, BAS lodgement, bookkeeping, and business advisory for individuals and small businesses.',
    phone: '07 3456 7890',
    email: 'raj@rajsaccounting.com.au',
    website: 'https://rajsaccounting.com.au',
    address: 'Suite 3, 78 Queen Street',
    suburb: 'Brisbane CBD',
    state: 'QLD',
    postcode: '4000',
    status: 'active',
    isVerified: true,
    plan: 'premium',
    ratingAvg: 4.7,
    ratingCount: 56,
    viewCount: 1230,
    leadCount: 34,
    tags: ['accountant', 'tax return', 'BAS', 'bookkeeping', 'small business', 'Xero'],
    businessHours: JSON.stringify({
      monday: '09:00-17:30',
      tuesday: '09:00-17:30',
      wednesday: '09:00-17:30',
      thursday: '09:00-19:00',
      friday: '09:00-17:00',
      saturday: '10:00-14:00',
      sunday: 'Closed'
    }),
    logoUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0a07?w=800&h=400&fit=crop',
    ownerEmail: 'raj@example.com'  // Assign to Raj
  },
  {
    slug: 'melbourne-indian-grocery',
    title: 'Melbourne Indian Grocery',
    category: 'retail-shopping',
    city: 'Melbourne',
    description: `Your one-stop shop for all Indian and South Asian groceries in Melbourne. We stock over 5000 products from India, Pakistan, Sri Lanka, and Bangladesh.`,
    shortDescription: 'Premium Indian grocery store with fresh produce, spices, frozen foods, and daily deliveries.',
    phone: '03 9876 5432',
    email: 'store@melbgrocery.com.au',
    website: 'https://melbgrocery.com.au',
    address: '22 Victoria Street',
    suburb: 'Richmond',
    state: 'VIC',
    postcode: '3121',
    status: 'active',
    plan: 'free',
    ratingAvg: 4.6,
    ratingCount: 234,
    viewCount: 5670,
    leadCount: 120,
    tags: ['grocery', 'indian spices', 'basmati rice', 'frozen food', 'halal', 'vegetables'],
    businessHours: JSON.stringify({
      monday: '09:00-20:00',
      tuesday: '09:00-20:00',
      wednesday: '09:00-20:00',
      thursday: '09:00-20:00',
      friday: '09:00-21:00',
      saturday: '09:00-21:00',
      sunday: '10:00-18:00'
    }),
    logoUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=800&h=400&fit=crop',
    ownerEmail: 'raj@example.com'  // Assign to Raj
  },
  {
    slug: 'priyas-beauty-salon',
    title: "Priya's Beauty Salon",
    category: 'beauty-wellness',
    city: 'Perth',
    description: `Priya's Beauty Salon is Perth's premier destination for Indian bridal makeup, mehndi, and traditional beauty services.`,
    shortDescription: 'Specialist in Indian bridal makeup, mehndi, threading, and beauty treatments. Wedding packages available.',
    phone: '08 9234 5678',
    email: 'priya@priyasbeauty.com.au',
    website: 'https://priyasbeauty.com.au',
    address: '15 Beaufort Street',
    suburb: 'Northbridge',
    state: 'WA',
    postcode: '6003',
    status: 'active',
    isFeatured: true,
    isVerified: true,
    plan: 'premium',
    ratingAvg: 4.9,
    ratingCount: 112,
    viewCount: 2450,
    leadCount: 89,
    tags: ['bridal makeup', 'mehndi', 'threading', 'hair salon', 'beauty parlour', 'wedding'],
    businessHours: JSON.stringify({
      monday: '10:00-19:00',
      tuesday: '10:00-19:00',
      wednesday: '10:00-19:00',
      thursday: '10:00-20:00',
      friday: '10:00-20:00',
      saturday: '10:00-18:00',
      sunday: '11:00-16:00'
    }),
    logoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&h=400&fit=crop',
    socialInstagram: 'https://instagram.com/priyasbeauty',
    socialFacebook: 'https://facebook.com/priyasbeauty',
    ownerEmail: 'priya@priyasbeauty.com.au'  // Assign to Priya
  }
];

// Products for each listing
const productsByListing = {
  'spice-route-indian-restaurant': [
    { name: 'Chicken Biryani', description: 'Authentic Hyderabadi chicken biryani', price: 18.99, priceUnit: 'per serving', imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Main Course' },
    { name: 'Butter Chicken', description: 'Creamy tomato-based curry', price: 22.99, priceUnit: 'per serving', imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Main Course' },
    { name: 'Garlic Naan', description: 'Freshly baked naan bread', price: 4.99, priceUnit: 'per piece', imageUrl: 'https://images.unsplash.com/photo-1609862537235-41cbb2f157a2?w=400&h=300&fit=crop', isAvailable: true, isFeatured: false, category: 'Bread' }
  ],
  'singh-associates-migration-lawyers': [
    { name: 'Visa Consultation', description: '30-min consultation with MARA agent', price: 150, priceUnit: 'per session', imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Consultation' }
  ],
  'rajs-accounting-tax-services': [
    { name: 'Individual Tax Return', description: 'Complete tax return preparation', price: 99, priceUnit: 'per return', imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Tax Services' }
  ],
  'priyas-beauty-salon': [
    { name: 'Bridal Makeup Package', description: 'Complete bridal makeup with mehndi', price: 499, priceUnit: 'package', imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Bridal' }
  ],
  'melbourne-indian-grocery': [
    { name: 'Premium Basmati Rice (5kg)', description: 'Aged basmati rice', price: 24.99, priceUnit: 'per pack', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Rice' }
  ],
  'punjabi-tandoor': [
    { name: 'Tandoori Chicken', description: 'Whole chicken marinated in spices', price: 24.99, priceUnit: 'full', imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop', isAvailable: true, isFeatured: true, category: 'Tandoor' }
  ]
};

// Reviews
const reviewsByListing = {
  'spice-route-indian-restaurant': [
    { reviewerName: 'Amit Sharma', reviewerEmail: 'amit@example.com', rating: 5, title: 'Best Indian food!', body: 'Absolutely amazing food and service!', status: 'approved', helpfulCount: 12 }
  ],
  'singh-associates-migration-lawyers': [
    { reviewerName: 'Neha Gupta', reviewerEmail: 'neha@example.com', rating: 5, title: 'Highly professional', body: 'Got our PR approved!', status: 'approved', helpfulCount: 15 }
  ]
};

// Blog posts
const blogPosts = [
  {
    title: "Top Indian Restaurants in Melbourne",
    slug: "top-indian-restaurants-melbourne",
    excerpt: "Discover the best Indian restaurants in Melbourne",
    content: "<h2>Best Indian Restaurants</h2><p>Melbourne has amazing Indian food...</p>",
    coverUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=400&fit=crop",
    tags: ["restaurants", "melbourne"],
    status: "published",
    viewCount: 1250
  },
  {
    title: "Australian Visa Guide for Indians",
    slug: "australian-visa-guide-indians",
    excerpt: "Complete guide to Australian visas",
    content: "<h2>Visa Guide</h2><p>Everything you need to know...</p>",
    coverUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop",
    tags: ["visa", "migration"],
    status: "published",
    viewCount: 890
  }
];

// Advertisements
const advertisements = [
  { 
    title: '20% Off on All Main Courses', 
    businessName: 'Spice Route Restaurant', 
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop', 
    linkUrl: '/listings/spice-route-indian-restaurant', 
    placement: 'hero_top', 
    isActive: true, 
    sortOrder: 1,
    startDate: new Date()
  },
  { 
    title: 'Free Visa Assessment', 
    businessName: 'Singh & Associates', 
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=728&h=200&fit=crop', 
    linkUrl: '/listings/singh-associates-migration-lawyers', 
    placement: 'banner_mid', 
    isActive: true, 
    sortOrder: 1,
    startDate: new Date()
  },
  { 
    title: 'Free Delivery on $50+', 
    businessName: 'Melbourne Indian Grocery', 
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=300&h=250&fit=crop', 
    linkUrl: '/listings/melbourne-indian-grocery', 
    placement: 'sidebar_left', 
    isActive: true, 
    sortOrder: 1,
    startDate: new Date()
  }
];

async function main() {
  console.log('🌱 Starting seed...\n');

  // 1. Create Super Admin
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ozbiz.com.au' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@ozbiz.com.au',
      passwordHash: adminHash,
      role: 'superadmin',
      userType: 'both',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log('✅ Super Admin created');
  console.log('   Email: admin@ozbiz.com.au / Password: Admin@123456\n');

  // 2. Create Consumer Users
  const consumerHash = await bcrypt.hash('Consumer@123', 12);
  const consumers = [
    { name: 'Amit Sharma', email: 'amit@example.com' },
    { name: 'Priya Patel', email: 'priya@example.com' },
    { name: 'Rajesh Kumar', email: 'rajesh@example.com' },
  ];
  
  for (const consumer of consumers) {
    await prisma.user.upsert({
      where: { email: consumer.email },
      update: {},
      create: {
        name: consumer.name,
        email: consumer.email,
        passwordHash: consumerHash,
        role: 'user',
        userType: 'consumer',
        isActive: true,
        emailVerified: true,
      },
    });
  }
  console.log(`✅ ${consumers.length} Consumer users created`);
  console.log('   Password for all consumers: Consumer@123\n');

  // 3. Create Vendor Users
  const vendorHash = await bcrypt.hash('Vendor@123', 12);
  
  // First, create the vendor users
  const vendorUsers = [
    { 
      name: 'Raj Kumar', 
      email: 'raj@example.com',
      businessName: 'Spice Route Restaurant & Accounting Services',
      businessABN: '12 345 678 901',
      subscriptionPlan: 'premium'
    },
    { 
      name: 'Harpreet Singh', 
      email: 'harpreet@singhlaw.com.au',
      businessName: 'Singh & Associates Migration Lawyers & Punjabi Tandoor',
      businessABN: '23 456 789 012',
      subscriptionPlan: 'elite'
    },
    { 
      name: 'Priya Sharma', 
      email: 'priya@priyasbeauty.com.au',
      businessName: "Priya's Beauty Salon",
      businessABN: '34 567 890 123',
      subscriptionPlan: 'premium'
    }
  ];
  
  const vendorMap = {};
  for (const vendor of vendorUsers) {
    const created = await prisma.user.upsert({
      where: { email: vendor.email },
      update: {},
      create: {
        name: vendor.name,
        email: vendor.email,
        passwordHash: vendorHash,
        role: 'user',
        userType: 'vendor',
        businessName: vendor.businessName,
        businessABN: vendor.businessABN,
        subscriptionPlan: vendor.subscriptionPlan,
        isActive: true,
        emailVerified: true,
      },
    });
    vendorMap[vendor.email] = created.id;
    console.log(`✅ Vendor created: ${vendor.name} (${vendor.email})`);
  }
  console.log('   Password for all vendors: Vendor@123\n');

  // 4. Create categories
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: { slug: categories[i].slug },
      update: {},
      create: { ...categories[i], sortOrder: i, isActive: true },
    });
  }
  console.log(`✅ ${categories.length} categories created\n`);

  // Get category references
  const cats = {};
  for (const cat of categories) {
    cats[cat.slug] = await prisma.category.findUnique({ where: { slug: cat.slug } });
  }

  // 5. Create listings with proper vendor assignment
  const listingOwnerMap = {
    'spice-route-indian-restaurant': 'raj@example.com',
    'punjabi-tandoor': 'harpreet@singhlaw.com.au',
    'singh-associates-migration-lawyers': 'harpreet@singhlaw.com.au',
    'rajs-accounting-tax-services': 'raj@example.com',
    'melbourne-indian-grocery': 'raj@example.com',
    'priyas-beauty-salon': 'priya@priyasbeauty.com.au'
  };

  const createdListings = {};
  for (const data of listingsData) {
    const ownerEmail = listingOwnerMap[data.slug];
    const userId = vendorMap[ownerEmail];
    
    if (!userId) {
      console.error(`❌ No vendor found for email: ${ownerEmail}`);
      continue;
    }
    
    const listing = await prisma.listing.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        userId: userId,
        categoryId: cats[data.category]?.id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        phone: data.phone,
        email: data.email,
        website: data.website,
        address: data.address,
        suburb: data.suburb,
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        status: data.status,
        isFeatured: data.isFeatured || false,
        isVerified: data.isVerified || false,
        plan: data.plan,
        ratingAvg: data.ratingAvg,
        ratingCount: data.ratingCount,
        viewCount: data.viewCount,
        leadCount: data.leadCount || 0,
        tags: data.tags,
        businessHours: data.businessHours,
        logoUrl: data.logoUrl,
        coverUrl: data.coverUrl,
        socialFacebook: data.socialFacebook,
        socialInstagram: data.socialInstagram,
        socialLinkedin: data.socialLinkedin,
      },
    });
    createdListings[data.slug] = listing;
    console.log(`✅ Listing: ${data.title} (Owner: ${ownerEmail})`);
  }
  console.log('');

  // 6. Add products
  for (const [slug, products] of Object.entries(productsByListing)) {
    const listing = createdListings[slug];
    if (listing) {
      for (const product of products) {
        await prisma.product.create({
          data: { ...product, listingId: listing.id },
        });
      }
      console.log(`✅ Added ${products.length} products to ${slug}`);
    }
  }
  console.log('');

  // 7. Add reviews
  for (const [slug, reviews] of Object.entries(reviewsByListing)) {
    const listing = createdListings[slug];
    if (listing) {
      for (const review of reviews) {
        await prisma.review.create({
          data: { ...review, listingId: listing.id },
        });
      }
      console.log(`✅ Added reviews to ${slug}`);
    }
  }
  console.log('');

  // 8. Add blog posts
  for (const post of blogPosts) {
    await prisma.blog.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...post,
        authorId: admin.id,
        publishedAt: new Date(),
      },
    });
  }
  console.log(`✅ ${blogPosts.length} blog posts created\n`);

  // 9. Add advertisements
  for (const ad of advertisements) {
    await prisma.advertisement.create({
      data: ad,
    });
  }
  console.log(`✅ ${advertisements.length} ads created\n`);

  // 10. Update category counts
  for (const cat of Object.values(cats)) {
    const count = await prisma.listing.count({
      where: { categoryId: cat.id, status: 'active' },
    });
    await prisma.category.update({
      where: { id: cat.id },
      data: { listingCount: count },
    });
  }

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Database Statistics:');
  console.log(`   • Users: ${await prisma.user.count()}`);
  console.log(`   • Categories: ${await prisma.category.count()}`);
  console.log(`   • Listings: ${await prisma.listing.count()}`);
  console.log(`   • Products: ${await prisma.product.count()}`);
  console.log(`   • Reviews: ${await prisma.review.count()}`);
  console.log(`   • Blogs: ${await prisma.blog.count()}`);
  console.log(`   • Ads: ${await prisma.advertisement.count()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 SUPER ADMIN:');
  console.log('   Email: admin@ozbiz.com.au');
  console.log('   Password: Admin@123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 CONSUMER ACCOUNTS:');
  console.log('   Email: amit@example.com / Password: Consumer@123');
  console.log('   Email: priya@example.com / Password: Consumer@123');
  console.log('   Email: rajesh@example.com / Password: Consumer@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏢 VENDOR ACCOUNTS:');
  console.log('   Email: raj@example.com / Password: Vendor@123');
  console.log('   → Businesses: Spice Route Restaurant, Raj\'s Accounting, Melbourne Indian Grocery');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Email: harpreet@singhlaw.com.au / Password: Vendor@123');
  console.log('   → Businesses: Singh & Associates Migration, Punjabi Tandoor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Email: priya@priyasbeauty.com.au / Password: Vendor@123');
  console.log('   → Business: Priya\'s Beauty Salon');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(e => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());