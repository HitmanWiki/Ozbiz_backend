// backend/update-images.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imageUpdates = {
  'spice-route-indian-restaurant': {
    logoUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=400&fit=crop'
  },
  'singh-associates-migration-lawyers': {
    logoUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop'
  },
  'rajs-accounting-tax-services': {
    logoUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0a07?w=800&h=400&fit=crop'
  },
  'melbourne-indian-grocery': {
    logoUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=800&h=400&fit=crop'
  },
  'priyas-beauty-salon': {
    logoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&h=400&fit=crop'
  },
  'punjabi-tandoor': {
    logoUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=200&h=200&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&h=400&fit=crop'
  }
};

async function updateImages() {
  console.log('Updating listing images...\n');
  
  for (const [slug, images] of Object.entries(imageUpdates)) {
    const updated = await prisma.listing.update({
      where: { slug },
      data: {
        logoUrl: images.logoUrl,
        coverUrl: images.coverUrl
      }
    });
    console.log(`✅ Updated ${updated.title}`);
  }
  
  console.log('\n🎉 All listings updated with images!');
  process.exit();
}

updateImages().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});