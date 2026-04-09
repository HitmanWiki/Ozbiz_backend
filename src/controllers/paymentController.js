// backend/src/controllers/paymentController.js
const prisma = require('../lib/prisma');

// Make Stripe optional
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe payment integration enabled');
} else {
  console.log('⚠️ Stripe payment integration disabled - API key missing');
}

// Create checkout session
const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({ error: 'Stripe payment not configured' });
    }
    
    const { planId, planName, price } = req.body;
    
    const priceIdMap = {
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
      elite: process.env.STRIPE_ELITE_PRICE_ID
    };
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIdMap[planId],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id,
        planId: planId
      }
    });
    
    res.json({ url: session.url });
  } catch (err) {
    console.error('Create checkout session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// Create manual checkout (fallback when Stripe is not configured)
const createManualCheckout = async (req, res) => {
  try {
    const { planId } = req.body;
    const plans = { premium: 29, elite: 79 };
    const amount = plans[planId];
    
    if (!amount) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Create subscription record
    const subscription = await prisma.subscriptionHistory.create({
      data: {
        userId: req.user.id,
        plan: planId,
        amount: amount,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({
      subscriptionId: subscription.id,
      amount: amount,
      planId: planId,
      message: 'Please contact support to complete payment',
      instructions: 'Payment can be made via bank transfer. Contact support@ozbiz.com.au for details.'
    });
  } catch (err) {
    console.error('Create manual checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
};

// Verify payment
const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!stripe) {
      // If Stripe not configured, assume manual payment
      return res.json({ success: true, message: 'Payment will be processed manually' });
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      // Update user subscription
      await prisma.user.update({
        where: { id: req.user.id },
        data: { 
          subscriptionPlan: session.metadata.planId, 
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
        }
      });
      
      await prisma.subscriptionHistory.updateMany({
        where: { userId: req.user.id, status: 'pending' },
        data: { status: 'active', stripePaymentId: sessionId }
      });
      
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.json({ success: false, message: 'Payment not completed' });
    }
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Webhook handler (only if Stripe is configured)
const handleWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: 'Stripe webhook not configured' });
  }
  
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, planId } = session.metadata;
    
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionPlan: planId, subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });
    
    await prisma.subscriptionHistory.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'active', stripePaymentId: session.id }
    });
  }
  
  res.json({ received: true });
};

module.exports = { createCheckoutSession, createManualCheckout, handleWebhook, verifyPayment };