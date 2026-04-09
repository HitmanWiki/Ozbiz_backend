// backend/src/controllers/notificationController.js
const webpush = require('web-push');

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:support@ozbiz.com.au',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const saveSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: req.user.id, endpoint: subscription.endpoint } },
      update: subscription,
      create: { userId: req.user.id, endpoint: subscription.endpoint, keys: subscription.keys }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
};

const sendPushNotification = async (userId, title, body, url) => {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body, url })
      );
    } catch (err) {
      console.error('Push notification error:', err);
    }
  }
};