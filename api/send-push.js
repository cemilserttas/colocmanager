const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BN29BeOIv9Jrkh5opy8rSf2BWgRUI5Mk9-I07X_7gXT2Q1rJpZO9gKgPkSpMEgw175Sl7iT4v2lsgzi3ADPpeZs';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'd5BnykkP74Jm3a_MfJDu62iAjDn6xlNOQi0AeBwc-E0';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@colocmanager.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.error('Failed to configure VAPID details:', err);
}

module.exports = async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptions, subscription, title, body, data, delaySeconds } = req.body || {};

    let targets = [];
    if (subscriptions && Array.isArray(subscriptions)) {
      targets = subscriptions;
    } else if (subscription && typeof subscription === 'object') {
      targets = [subscription];
    } else if (subscriptions && typeof subscriptions === 'object') {
      targets = [subscriptions];
    }

    if (targets.length === 0) {
      return res.status(400).json({ error: 'Aucune souscription Web Push fournie.' });
    }

    const payload = JSON.stringify({
      title: title || 'ColocManager',
      body: body || '',
      data: data || {},
      icon: '/icon.png',
      badge: '/icon.png',
    });

    const dispatchNotifications = async () => {
      let delivered = 0;
      let failed = 0;
      const expiredEndpoints = [];

      for (const sub of targets) {
        if (!sub || !sub.endpoint) continue;
        try {
          await webpush.sendNotification(sub, payload);
          delivered++;
        } catch (error) {
          failed++;
          console.error('Error dispatching web push to endpoint:', sub.endpoint, error?.statusCode, error?.message);
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      }
      return { delivered, failed, expiredEndpoints };
    };

    if (delaySeconds && Number(delaySeconds) > 0) {
      // Allow user to lock their phone / close the app before the notification is sent!
      setTimeout(async () => {
        try {
          await dispatchNotifications();
        } catch (err) {
          console.error('Delayed push dispatch failed:', err);
        }
      }, Number(delaySeconds) * 1000);

      return res.status(200).json({
        success: true,
        message: `Notification programmée dans ${delaySeconds} secondes pour test avec application fermée.`,
      });
    }

    const result = await dispatchNotifications();
    return res.status(200).json({
      success: true,
      delivered: result.delivered,
      failed: result.failed,
      expiredEndpoints: result.expiredEndpoints,
    });
  } catch (error) {
    console.error('send-push handler error:', error);
    return res.status(500).json({ error: error?.message || 'Erreur interne du serveur' });
  }
};
