// Migration script: backfill product fields and user roles
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('../server').Product || null;

// Since Product is defined in server.js (not exported), we'll connect directly and use Mongoose model retrieval
(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for migration');

    // Ensure models are available
    let ProductModel;
    try { ProductModel = mongoose.model('Product'); } catch (e) { ProductModel = null; }
    if (!ProductModel) {
      // define minimal schema for migration (must match current schema keys we want to update)
      const schema = new mongoose.Schema({}, { strict: false });
      ProductModel = mongoose.model('Product', schema, 'products');
    }

    let UserModel;
    try { UserModel = mongoose.model('User'); } catch (e) {
      const userSchema = new mongoose.Schema({}, { strict: false });
      UserModel = mongoose.model('User', userSchema, 'users');
    }

    // 1) Update products: add description, images array from image, default sku/materials/tags
    const products = await ProductModel.find();
    console.log(`Found ${products.length} products`);
    for (const p of products) {
      const updates = {};
      if (typeof p.description === 'undefined') updates.description = '';
      if ((!p.images || !p.images.length) && p.image) updates.images = [p.image];
      if (typeof p.sku === 'undefined') updates.sku = null;
      if (!p.materials) updates.materials = [];
      if (!p.tags) updates.tags = [];
      if (!p.createdAt) updates.createdAt = p._id && p._id.getTimestamp ? p._id.getTimestamp() : new Date();

      if (Object.keys(updates).length) {
        await ProductModel.updateOne({ _id: p._id }, { $set: updates });
        console.log('Patched product', p._id.toString());
      }
    }

    // 2) Update users: add role default 'customer'
    const users = await UserModel.find();
    console.log(`Found ${users.length} users`);
    for (const u of users) {
      if (typeof u.role === 'undefined') {
        await UserModel.updateOne({ _id: u._id }, { $set: { role: 'customer' } });
        console.log('Patched user role', u._id.toString());
      }
    }

    // 3) Optionally create admin/manager users if env vars provided (SITE_ADMIN_USER/SITE_ADMIN_PASS, ADMIN_USER/ADMIN_PASS)
    const siteAdminUser = process.env.SITE_ADMIN_USER;
    const siteAdminPass = process.env.SITE_ADMIN_PASS;
    if (siteAdminUser && siteAdminPass) {
      const exists = await UserModel.findOne({ email: siteAdminUser });
      if (!exists) {
        const hashed = await bcrypt.hash(siteAdminPass, 12);
        await UserModel.create({ email: siteAdminUser, password: hashed, name: 'Site Admin', phone: '000', role: 'admin' });
        console.log('Created site admin user', siteAdminUser);
      } else {
        console.log('Site admin user already exists');
      }
    }

    // manager (from ADMIN_USER & ADMIN_PASS if provided)
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS || null;
    if (adminUser && adminPass) {
      const exists = await UserModel.findOne({ email: adminUser });
      if (!exists) {
        const hashed = await bcrypt.hash(adminPass, 12);
        const emailToUse = String(adminUser).includes('@') ? adminUser : `${adminUser}@example.com`;
        await UserModel.create({ email: emailToUse, password: hashed, name: 'Manager', phone: '000', role: 'manager' });
        console.log('Created manager user', emailToUse);
      } else {
        console.log('Manager user already exists');
      }
    }

    // Support creating manager/admin users when only hashed passwords are provided in env
    const adminHash = process.env.ADMIN_PASS_HASH || '';
    if (adminUser && adminHash && !adminPass) {
      const exists = await UserModel.findOne({ email: adminUser });
      if (!exists) {
        // Insert user using provided hash (assumed bcrypt hash)
        const emailToUse = String(adminUser).includes('@') ? adminUser : `${adminUser}@example.com`;
        await UserModel.create({ email: emailToUse, password: adminHash, name: 'Manager', phone: '000', role: 'manager' });
        console.log('Created manager user from ADMIN_PASS_HASH', emailToUse);
      } else {
        console.log('Manager user already exists (ADMIN_PASS_HASH)');
      }
    }

    // SITE_ADMIN creation using SITE_ADMIN_PASS_HASH if present
    const siteAdminFromHash = process.env.SITE_ADMIN_USER || process.env.ADMIN2_USER || '';
    const siteAdminHash = process.env.SITE_ADMIN_PASS_HASH || process.env.ADMIN2_PASS_HASH || '';
    if (siteAdminFromHash && siteAdminHash) {
      const existsAdmin = await UserModel.findOne({ email: siteAdminFromHash });
      if (!existsAdmin) {
        const emailToUse = String(siteAdminFromHash).includes('@') ? siteAdminFromHash : `${siteAdminFromHash}@example.com`;
        await UserModel.create({ email: emailToUse, password: siteAdminHash, name: 'Site Admin', phone: '000', role: 'admin' });
        console.log('Created site admin user from SITE_ADMIN_PASS_HASH', emailToUse);
      } else {
        console.log('Site admin user already exists (SITE_ADMIN_PASS_HASH)');
      }
    }

    console.log('Migration completed');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
