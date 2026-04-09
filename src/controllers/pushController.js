// backend/src/controllers/pushController.js
const webpush = require('web-push');
const prisma = require('../lib/prisma');

// Only configure VAPID if keys are present
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@ozbiz.com.au',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push notifications enabled');
} else {
  console.log('⚠️ Web Push notifications disabled - VAPID keys missing');
}

// Save subscription
const subscribe = async (req, res) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(501).json({ error: 'Push notifications not configured' });
    }
    
    const { subscription } = req.body;
    
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: req.user.id,
          endpoint: subscription.endpoint
        }
      },
      update: { keys: subscription.keys, updatedAt: new Date() },
      create: {
        userId: req.user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
};

// Unsubscribe
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await prisma.pushSubscription.deleteMany({
      where: { userId: req.user.id, endpoint }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
};

// Send notification to user
const sendPushNotification = async (userId, title, body, url) => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('Push notifications disabled - VAPID keys missing');
    return;
  }
  
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });
    
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (err) {
    console.error('Send notification error:', err);
  }
};

// Test notification
const testNotification = async (req, res) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(501).json({ error: 'Push notifications not configured' });
    }
    
    await sendPushNotification(
      req.user.id,
      'Test Notification',
      'This is a test push notification from OzBiz!',
      '/dashboard'
    );
    res.json({ message: 'Test notification sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

module.exports = { subscribe, unsubscribe, testNotification, sendPushNotification };