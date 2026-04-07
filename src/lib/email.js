// src/lib/email.js
// Transactional email service using Nodemailer
// Supports SMTP (Gmail, Outlook, etc.) and any SMTP provider

const nodemailer = require('nodemailer');

// Build transporter from env vars
const createTransporter = () => {
  // Support for different providers via env vars
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Gmail shorthand
  if (process.env.GMAIL_USER) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
  }
  // Fallback: log to console in dev
  return null;
};

const FROM = process.env.EMAIL_FROM || '"OzBiz Directory" <noreply@ozbiz.com.au>';
const SITE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SITE_NAME = 'OzBiz Directory';

// Shared base layout
const baseHtml = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <style>
    body { margin: 0; padding: 0; background: #f1f5f9; font-family: 'DM Sans', Arial, sans-serif; }
    .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0a1d3d; padding: 28px 36px; display: flex; align-items: center; gap: 12px; }
    .header-logo { width: 36px; height: 36px; background: #c8971e; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: #0a1d3d; font-family: Georgia, serif; }
    .header-name { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header-name span { color: #c8971e; }
    .body { padding: 36px; color: #1e3a5f; }
    h1 { font-size: 22px; font-weight: 700; color: #0a1d3d; margin: 0 0 12px; }
    p { font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 16px; }
    .btn { display: inline-block; background: #0a1d3d; color: #fff !important; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 8px 0 20px; }
    .btn-gold { background: #c8971e; color: #0a1d3d !important; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-label { color: #94a3b8; }
    .info-val { color: #1e3a5f; font-weight: 500; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
    .footer a { color: #c8971e; text-decoration: none; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-logo">O</div>
      <div class="header-name">Oz<span>Biz</span> Directory</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${SITE_NAME} · <a href="${SITE_URL}">Visit Website</a> · Australia's Indian Business Directory</p>
    </div>
  </div>
</body>
</html>
`;

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  if (!transporter) {
    // Dev fallback — log to console
    console.log(`\n📧 EMAIL (dev mode — not sent):`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Preview: ${text?.substring(0, 100) || '—'}\n`);
    return { messageId: 'dev-mode' };
  }
  try {
    return await transporter.sendMail({ from: FROM, to, subject, html, text });
  } catch (err) {
    console.error('Email send error:', err.message);
    // Don't throw — email failures shouldn't crash the API
  }
};

// ─── Email Templates ──────────────────────────────────────

const email = {

  // 1. Email verification
  async sendVerification({ to, name, token }) {
    const link = `${SITE_URL}/verify-email?token=${token}`;
    return sendMail({
      to,
      subject: 'Verify your OzBiz account',
      text: `Hi ${name}, verify your email: ${link}`,
      html: baseHtml(`
        <h1>Verify Your Email Address</h1>
        <p>Hi <strong>${name}</strong>, welcome to OzBiz Directory!</p>
        <p>Please verify your email address to activate your account and start listing your business.</p>
        <a class="btn btn-gold" href="${link}">Verify Email Address</a>
        <p style="font-size:13px;color:#94a3b8;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      `),
    });
  },

  // 2. Welcome email (after verification)
  async sendWelcome({ to, name }) {
    return sendMail({
      to,
      subject: `Welcome to OzBiz Directory, ${name}!`,
      text: `Hi ${name}, your account is now active. List your business at ${SITE_URL}/add-listing`,
      html: baseHtml(`
        <h1>You're all set, ${name}! 🎉</h1>
        <p>Your email is verified and your OzBiz account is now fully active.</p>
        <p>Start by listing your business — it's free and takes less than 5 minutes.</p>
        <a class="btn btn-gold" href="${SITE_URL}/add-listing">Add Your Business</a>
        <a class="btn" href="${SITE_URL}">Browse Directory</a>
      `),
    });
  },

  // 3. Listing submitted (to business owner)
  async sendListingSubmitted({ to, name, listingTitle }) {
    return sendMail({
      to,
      subject: `Your listing "${listingTitle}" has been submitted`,
      text: `Hi ${name}, your listing "${listingTitle}" is under review.`,
      html: baseHtml(`
        <h1>Listing Submitted for Review</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your business listing <strong>"${listingTitle}"</strong> has been submitted and is now under review by our team.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Status</span><span class="badge badge-amber">Under Review</span></div>
          <div class="info-row"><span class="info-label">Review time</span><span class="info-val">24–48 hours</span></div>
        </div>
        <p>We'll notify you as soon as your listing is approved. You can check status anytime in your dashboard.</p>
        <a class="btn" href="${SITE_URL}/dashboard">View Dashboard</a>
      `),
    });
  },

  // 4. Listing approved
  async sendListingApproved({ to, name, listingTitle, listingSlug }) {
    const link = `${SITE_URL}/listings/${listingSlug}`;
    return sendMail({
      to,
      subject: `✅ Your listing "${listingTitle}" is now live!`,
      text: `Congratulations ${name}! Your listing is live: ${link}`,
      html: baseHtml(`
        <h1>Your Listing is Live! 🎉</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Great news! Your business listing <strong>"${listingTitle}"</strong> has been approved and is now live on OzBiz Directory.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Status</span><span class="badge badge-green">Active & Live</span></div>
        </div>
        <a class="btn btn-gold" href="${link}">View Your Listing</a>
        <a class="btn" href="${SITE_URL}/dashboard">Manage Dashboard</a>
        <hr class="divider">
        <p>💡 <strong>Tip:</strong> Upgrade to a Featured plan to appear at the top of search results and get more visibility.</p>
      `),
    });
  },

  // 5. Listing rejected
  async sendListingRejected({ to, name, listingTitle, reason }) {
    return sendMail({
      to,
      subject: `Your listing "${listingTitle}" needs attention`,
      text: `Hi ${name}, your listing "${listingTitle}" was not approved. Reason: ${reason || 'Please contact support.'}`,
      html: baseHtml(`
        <h1>Listing Needs Attention</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Unfortunately your listing <strong>"${listingTitle}"</strong> could not be approved at this time.</p>
        ${reason ? `<div class="info-box"><p style="margin:0;font-size:14px;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
        <p>Please update your listing and resubmit, or contact our support team if you have questions.</p>
        <a class="btn" href="${SITE_URL}/dashboard">Edit Listing</a>
      `),
    });
  },

  // 6. New enquiry received (to business owner)
  async sendEnquiryReceived({ to, ownerName, listingTitle, senderName, senderEmail, senderPhone, subject, message }) {
    return sendMail({
      to,
      subject: `New enquiry for "${listingTitle}" from ${senderName}`,
      text: `${senderName} sent an enquiry: ${message}`,
      html: baseHtml(`
        <h1>New Enquiry Received</h1>
        <p>Hi <strong>${ownerName}</strong>,</p>
        <p>Someone has sent an enquiry about your business <strong>"${listingTitle}"</strong>.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">From</span><span class="info-val">${senderName}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-val">${senderEmail}</span></div>
          ${senderPhone ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-val">${senderPhone}</span></div>` : ''}
          ${subject ? `<div class="info-row"><span class="info-label">Subject</span><span class="info-val">${subject}</span></div>` : ''}
        </div>
        <div class="info-box">
          <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:1.7;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p>Reply directly to this email or contact them at <a href="mailto:${senderEmail}">${senderEmail}</a>.</p>
        <a class="btn" href="${SITE_URL}/dashboard">View in Dashboard</a>
      `),
    });
  },

  // 7. Enquiry confirmation (to sender)
  async sendEnquiryConfirmation({ to, senderName, listingTitle }) {
    return sendMail({
      to,
      subject: `Your enquiry to "${listingTitle}" has been sent`,
      text: `Hi ${senderName}, your enquiry has been delivered to ${listingTitle}.`,
      html: baseHtml(`
        <h1>Enquiry Sent Successfully</h1>
        <p>Hi <strong>${senderName}</strong>,</p>
        <p>Your enquiry has been delivered to <strong>"${listingTitle}"</strong>. The business will be in touch with you soon.</p>
        <div class="info-box">
          <p style="margin:0;font-size:13px;color:#64748b;">Typical response time: 24–48 hours</p>
        </div>
        <a class="btn" href="${SITE_URL}">Browse More Businesses</a>
      `),
    });
  },

  // 8. Enquiry reply (to original sender)
  async sendEnquiryReply({ to, senderName, listingTitle, replyMessage }) {
    return sendMail({
      to,
      subject: `Reply from "${listingTitle}"`,
      text: `${listingTitle} replied: ${replyMessage}`,
      html: baseHtml(`
        <h1>You Have a Reply!</h1>
        <p>Hi <strong>${senderName}</strong>,</p>
        <p><strong>"${listingTitle}"</strong> has replied to your enquiry:</p>
        <div class="info-box">
          <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:1.7;">${replyMessage.replace(/\n/g, '<br>')}</p>
        </div>
        <a class="btn btn-gold" href="${SITE_URL}/listings">View More Businesses</a>
      `),
    });
  },

  // 9. Password reset
  async sendPasswordReset({ to, name, token }) {
    const link = `${SITE_URL}/reset-password?token=${token}`;
    return sendMail({
      to,
      subject: 'Reset your OzBiz password',
      text: `Hi ${name}, reset your password: ${link}`,
      html: baseHtml(`
        <h1>Reset Your Password</h1>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below:</p>
        <a class="btn btn-gold" href="${link}">Reset Password</a>
        <p style="font-size:13px;color:#94a3b8;">This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
      `),
    });
  },

  // 10. New review submitted (to admin)
  async sendReviewAlert({ to, listingTitle, reviewerName, rating }) {
    return sendMail({
      to,
      subject: `New review pending moderation — ${listingTitle}`,
      text: `${reviewerName} left a ${rating}-star review for "${listingTitle}"`,
      html: baseHtml(`
        <h1>New Review Pending Moderation</h1>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Business</span><span class="info-val">${listingTitle}</span></div>
          <div class="info-row"><span class="info-label">Reviewer</span><span class="info-val">${reviewerName}</span></div>
          <div class="info-row"><span class="info-label">Rating</span><span class="info-val">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</span></div>
        </div>
        <a class="btn" href="${SITE_URL}/admin/reviews">Moderate Reviews</a>
      `),
    });
  },

  // 11. Newsletter welcome
  async sendNewsletterWelcome({ to, name }) {
    return sendMail({
      to,
      subject: 'Welcome to OzBiz Newsletter!',
      text: `Hi ${name || 'there'}, you're now subscribed to the OzBiz newsletter.`,
      html: baseHtml(`
        <h1>You're Subscribed! 🎉</h1>
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        <p>Thank you for subscribing to the OzBiz Newsletter! You'll receive updates on new businesses, featured listings, and community news.</p>
        <a class="btn btn-gold" href="${SITE_URL}">Explore OzBiz Directory</a>
        <p style="font-size:13px;color:#94a3b8;">You can unsubscribe anytime by replying "UNSUBSCRIBE" to any newsletter.</p>
      `),
    });
  },

  // 12. New listing alert (to admin)
  async sendNewListingAlert({ to, listingTitle, ownerName, ownerEmail, city }) {
    return sendMail({
      to,
      subject: `New listing pending review: ${listingTitle}`,
      text: `${ownerName} submitted "${listingTitle}" in ${city}`,
      html: baseHtml(`
        <h1>New Listing Submitted</h1>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Business</span><span class="info-val">${listingTitle}</span></div>
          <div class="info-row"><span class="info-label">Owner</span><span class="info-val">${ownerName}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-val">${ownerEmail}</span></div>
          <div class="info-row"><span class="info-label">City</span><span class="info-val">${city || '—'}</span></div>
        </div>
        <a class="btn" href="${SITE_URL}/admin/listings">Review in Admin Panel</a>
      `),
    });
  },
};

module.exports = email;
