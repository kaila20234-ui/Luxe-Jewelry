import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const schema = new mongoose.Schema({}, { strict: false, collection: 'newslettercampaigns' });
const Campaign = mongoose.model('Campaign', schema);

const campaigns = await Campaign.find({}).sort({ sentAt: -1 }).limit(10).lean();

console.log('Recent newsletter campaigns:');
campaigns.forEach((c, i) => {
  console.log(`\n[${i}] id: ${c._id}`);
  console.log(`  status: ${c.status}`);
  console.log(`  subject: ${c.subject}`);
  console.log(`  sentAt: ${c.sentAt}`);
  console.log(`  sentCount: ${c.sentCount || 0}, failedCount: ${c.failedCount || 0}`);
  console.log(`  messagePreview: ${String(c.message || '').slice(0,120).replace(/\n/g,' ')}...`);
});

await mongoose.disconnect();
