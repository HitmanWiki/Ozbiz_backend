// backend/src/controllers/chatbotController.js

// Knowledge base for common questions
const knowledgeBase = {
  // General Questions
  'what is ozbiz': 'OzBiz is Australia\'s leading Indian Business Directory connecting Indian businesses with customers across Melbourne, Sydney, Brisbane, Perth, and other major cities.',
  
  'how to find businesses': 'You can find businesses by using the search bar on the homepage. You can search by business name, category, city, or keywords. You can also browse by category or city from the navigation menu.',
  
  'how to contact business': 'Each business listing has a "Send Enquiry" form. Fill in your name, email, and message, and the business owner will receive your enquiry via email.',
  
  'is ozbiz free': 'Yes! Basic membership is free for both consumers and businesses. We also offer Premium and Elite plans for businesses wanting additional features and visibility.',
  
  // Consumer Questions
  'how to write review': 'Go to any business listing page, click on the "Reviews" tab, then click "Write a Review". Rate the business 1-5 stars and write your experience.',
  
  'how to save favorites': 'Click the heart icon on any business listing or detail page to save it to your favorites. You can view all saved businesses in your Profile under "Favorites".',
  
  'how to view my enquiries': 'Go to your Profile page and click on the "Enquiries" tab. You can see all your past enquiries and their status (New, Read, Replied).',
  
  'how to delete account': 'Please contact our support team at support@ozbiz.com.au to request account deletion. We\'ll process your request within 48 hours.',
  
  'forgot password': 'Click on "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link.',
  
  'email verification': 'After registering, check your email for a verification link. If you didn\'t receive it, you can request a new verification email from your profile settings.',
  
  // Vendor Questions
  'how to list business': 'Click on "Add Listing" in the navigation menu. Fill in your business details (Basic Info → Contact → Location → Social Media → Images → Products). Your listing will be reviewed and approved within 24-48 hours.',
  
  'how to edit listing': 'Go to your Vendor Dashboard, find your listing in the "My Listings" table, and click the "Edit" button. You can update any information about your business.',
  
  'how to manage leads': 'Go to Vendor Dashboard → "Manage Leads" or click "View" on recent leads. You can filter by status (New, Read, Replied, Archived) and reply directly to customers.',
  
  'how to reply to reviews': 'Go to Vendor Dashboard → "Reviews". Find the review you want to respond to and click "Reply". Enter your response and it will appear publicly below the review.',
  
  'subscription plans': 'We offer three plans: Free (1 listing), Premium ($29/month - 5 listings, featured placement), and Elite ($79/month - unlimited listings, top placement, priority support). Visit the Subscription page to upgrade.',
  
  'how to upload images': 'After creating your listing, go to the Images section. Select image type (Logo, Cover, Gallery), choose a file, and upload. Supported formats: JPG, PNG, WEBP. Max size: 5MB.',
  
  'how to add products': 'Go to your listing edit page → Products/Services section. Click "Add Product", fill in name, description, price, and image URL, then save.',
  
  // Technical Questions
  'supported browsers': 'OzBiz works best on Chrome, Firefox, Safari, and Edge (latest versions). We also support mobile browsers on iOS and Android.',
  
  'is it mobile friendly': 'Yes! OzBiz is fully responsive and works perfectly on mobile phones, tablets, and desktop computers.',
  
  'report issue': 'Please email us at support@ozbiz.com.au with details about the issue, including screenshots if possible. We typically respond within 24 hours.',
  
  'business hours': 'Our support team is available Monday-Friday, 9 AM - 6 PM AEST. For urgent issues, please email us and we\'ll get back to you as soon as possible.',
};

// Common variations of questions
const variations = {
  'what is ozbiz': ['what is ozbiz', 'about ozbiz', 'tell me about ozbiz', 'what is this website', 'what is oz biz'],
  'how to find businesses': ['find business', 'search business', 'how to search', 'looking for business', 'find listings'],
  'how to contact business': ['contact business', 'message business', 'send enquiry', 'how to message', 'ask question'],
  'how to write review': ['write review', 'leave review', 'rate business', 'submit review', 'post review'],
  'how to save favorites': ['save favorite', 'favorite business', 'bookmark', 'save listing', 'heart icon'],
  'how to list business': ['list business', 'add listing', 'become vendor', 'register business', 'create listing'],
  'how to edit listing': ['edit listing', 'update listing', 'modify business', 'change listing details'],
  'subscription plans': ['pricing', 'plans', 'upgrade', 'premium', 'elite', 'subscription cost'],
  'forgot password': ['reset password', 'change password', 'forgot password', 'password reset'],
};

// Find best matching answer
function findAnswer(question) {
  const normalizedQuestion = question.toLowerCase().trim();
  
  // Direct match
  if (knowledgeBase[normalizedQuestion]) {
    return knowledgeBase[normalizedQuestion];
  }
  
  // Check variations
  for (const [key, variants] of Object.entries(variations)) {
    if (variants.some(variant => normalizedQuestion.includes(variant) || variant.includes(normalizedQuestion))) {
      return knowledgeBase[key];
    }
  }
  
  // Check keyword matching
  const keywords = {
        'ozbiz': 'what is ozbiz',
    'business': 'how to find businesses',
    'search': 'how to find businesses',
    'review': 'how to write review',
    'rating': 'how to write review',
    'favorite': 'how to save favorites',
    'save': 'how to save favorites',
    'listing': 'how to list business',
    'vendor': 'how to list business',
    'edit': 'how to edit listing',
    'update': 'how to edit listing',
    'lead': 'how to manage leads',
    'enquiry': 'how to manage leads',
    'message': 'how to contact business',
    'contact': 'how to contact business',
    'price': 'subscription plans',
    'cost': 'subscription plans',
    'plan': 'subscription plans',
    'password': 'forgot password',
    'login': 'forgot password',
  };
  
  for (const [keyword, answerKey] of Object.entries(keywords)) {
    if (normalizedQuestion.includes(keyword)) {
      return knowledgeBase[answerKey];
    }
  }
  
  return null;
}

// Get chatbot response
const getChatbotResponse = async (req, res) => {
  try {
    const { message, userType = 'consumer' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let answer = findAnswer(message);
    
    // If no answer found, provide default response with suggestions
    if (!answer) {
      const suggestions = [
        'How to find businesses?',
        'How to write a review?',
        'How to list my business?',
        'What are subscription plans?',
        'How to reset password?'
      ];
      
      answer = `I'm not sure about that. Here are some things I can help with:\n• ${suggestions.join('\n• ')}\n\nOr you can email support@ozbiz.com.au for more help.`;
    }
    
    // Add user type specific info
    if (userType === 'vendor' && message.toLowerCase().includes('dashboard')) {
      answer += '\n\n💡 Tip: You can access your Vendor Dashboard from the user menu (click your avatar) → Vendor Dashboard.';
    }
    
    if (userType === 'consumer' && message.toLowerCase().includes('profile')) {
      answer += '\n\n💡 Tip: Your profile page lets you manage favorites, view enquiry history, and update notification settings.';
    }
    
    res.json({ 
      reply: answer,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Failed to get response' });
  }
};

// Get suggested questions based on user type
const getSuggestedQuestions = async (req, res) => {
  const { userType = 'consumer' } = req.query;
  
  const suggestions = {
    consumer: [
      'How to find businesses?',
      'How to write a review?',
      'How to save favorites?',
      'How to contact a business?',
      'Forgot password?'
    ],
    vendor: [
      'How to list my business?',
      'How to edit my listing?',
      'How to manage leads?',
      'How to reply to reviews?',
      'What are subscription plans?'
    ],
    both: [
      'How to find businesses?',
      'How to list my business?',
      'How to manage leads?',
      'How to write a review?',
      'Subscription plans?'
    ]
  };
  
  res.json({ 
    suggestions: suggestions[userType] || suggestions.consumer 
  });
};

module.exports = {
  getChatbotResponse,
  getSuggestedQuestions,
};