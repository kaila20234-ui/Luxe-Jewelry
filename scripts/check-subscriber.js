const mongoose = require('mongoose');
require('dotenv').config();

(async ()=>{
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const Newsletter = mongoose.model('Newsletter', new mongoose.Schema({}, {strict:false, collection:'newsletters'}));
    const Campaign = mongoose.model('Campaign', new mongoose.Schema({}, {strict:false, collection:'newslettercampaigns'}));
    const email = process.argv[2];
    if(!email){ console.error('Usage: node check-subscriber.js email@example.com'); process.exit(1);} 
    const sub = await Newsletter.findOne({ email: email });
    console.log('Subscriber:', !!sub);
    if(sub) console.log(JSON.stringify({ email: sub.email, isActive: sub.isActive, subscribedAt: sub.subscribedAt }, null, 2));
    const failed = await Campaign.find({ failedEmails: email }).lean();
    console.log('Campaigns with this email in failedEmails:', failed.length);
    failed.forEach(c => console.log(`- id:${c._id} status:${c.status} subject:${c.subject} sentAt:${c.sentAt}`));

    const included = await Campaign.find({ $or: [ { failedEmails: email }, { message: new RegExp(email, 'i') } ] }).lean();
    console.log('Campaigns mentioning email in message or failedEmails:', included.length);

    await mongoose.disconnect();
  }catch(e){ console.error(e); process.exit(1);} finally{}
  process.exit(0);
})();
