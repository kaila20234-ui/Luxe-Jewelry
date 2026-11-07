// Simple test script to fetch admin subscribers
// Usage: ADMIN_TOKEN=<token> node scripts/test-admin-subscribers.js
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const TOKEN = process.env.ADMIN_TOKEN;
if(!TOKEN){
  console.error('Please set ADMIN_TOKEN environment variable');
  process.exit(2);
}
(async ()=>{
  try{
    const res = await fetch(BASE + '/api/admin/subscribers', { headers: { 'Authorization': 'Bearer ' + TOKEN }});
    const data = await res.json();
    console.log('Status:', res.status);
    console.log(JSON.stringify(data, null, 2));
  }catch(err){
    console.error('Error:', err);
    process.exit(1);
  }
})();