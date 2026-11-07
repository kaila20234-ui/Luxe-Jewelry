require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../model/user');
const bcrypt = require('bcryptjs');

(async function(){
  try{
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry');
    const user = await User.findOne({ email: 'admin@luxejewelry.com' }).select('+password').lean();
    if(!user) {
      console.log('Admin user not found');
    } else {
      console.log('Admin user found:', user.email, 'role:', user.role);
      const match = await bcrypt.compare('Admin@123456', user.password || '');
      console.log('Password compare with Admin@123456 ->', match);
    }
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
