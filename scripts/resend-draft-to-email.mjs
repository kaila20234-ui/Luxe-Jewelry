import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import jwt from 'jsonwebtoken';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const Campaign = mongoose.model('Campaign', new mongoose.Schema({}, { strict:false, collection:'newslettercampaigns' }));

const draftId = process.argv[2] || '6a42108c078b91b5d5a494bb';
const recipient = process.argv[3] || 'hafizukaila81@gmail.com';

const draft = await Campaign.findById(draftId).lean();
if(!draft){
  console.error('Draft not found:', draftId);
  process.exit(1);
}

const adminToken = jwt.sign({ userId: 'admin', email: 'admin@local', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

function postSend(subject, message, recipients, includeStoreInfo){
  return new Promise((resolve,reject)=>{
    const payload = JSON.stringify({ subject, message, recipients, includeStoreInfo });
    const options = {
      hostname: 'localhost', port: 5000, path: '/api/newsletter/send', method: 'POST', timeout: 120000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), Authorization: `Bearer ${adminToken}` }
    };
    const req = http.request(options, (res)=>{
      let data=''; res.on('data', c=>data+=c); res.on('end', ()=>{ try{ resolve({ status: res.statusCode, data: JSON.parse(data) }); }catch(e){ resolve({ status: res.statusCode, data }); } });
    });
    req.on('error', reject); req.write(payload); req.end();
  });
}

console.log('Resending draft', draftId, 'to', recipient);
const includeStoreInfo = true;
const result = await postSend(draft.subject, draft.message, [recipient], includeStoreInfo);
console.log('Send response:', result.status, JSON.stringify(result.data, null,2));

// If campaignId returned, fetch campaign record
if(result.data && result.data.campaignId){
  const sentCampaign = await Campaign.findById(result.data.campaignId).lean();
  console.log('\nSaved campaign record:');
  console.log(' id:', sentCampaign._id);
  console.log(' status:', sentCampaign.status);
  console.log(' sentCount:', sentCampaign.sentCount);
  console.log(' failedCount:', sentCampaign.failedCount);
  console.log(' failedEmails:', sentCampaign.failedEmails);
}

await mongoose.disconnect();
process.exit(0);
