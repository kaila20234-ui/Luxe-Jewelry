import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const NewsletterCampaignSchema = new mongoose.Schema({}, { strict: false, collection: 'newslettercampaigns' });
const NewsletterSchema = new mongoose.Schema({}, { strict: false, collection: 'newsletters' });
const Campaign = mongoose.model('Campaign', NewsletterCampaignSchema);
const Subscriber = mongoose.model('Subscriber', NewsletterSchema);

const activeCount = await Subscriber.countDocuments({ isActive: true });

const subject = 'Luxe Jewelry Newsletter';
const message = `Hello valued subscriber,\n\nWe're excited to share our latest collections, exclusive offers, and styling tips with you.\n\nHighlights:\n- Exclusive Offers: Members-only discounts and special promotions\n- New Collections: First access to our latest pieces\n- Style Tips: Expert jewelry styling advice\n\nVisit our store for more: http://localhost:3000\n\nThank you for being part of Luxe Jewelry community!\n\n— Luxe Jewelry Team`;

const draft = new Campaign({
  subject,
  message,
  recipientCount: activeCount,
  sentCount: 0,
  failedCount: 0,
  failedEmails: [],
  status: 'draft',
  sentAt: null,
  sentBy: null
});

await draft.save();
console.log('Created draft campaign:');
console.log('  id:', draft._id);
console.log('  subject:', subject);
console.log('  recipients (estimated):', activeCount);

await mongoose.disconnect();
