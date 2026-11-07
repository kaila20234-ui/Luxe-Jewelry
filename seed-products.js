const mongoose = require('mongoose');

async function seedProducts() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/luxe_jewelry');
    console.log('🔗 Connected to MongoDB');
    
    // Define Product model inline
    const ProductSchema = new mongoose.Schema({
      name: { type: String, required: true },
      price: { type: Number, required: true },
      category: { type: String, default: "General" },
      image: { type: String, default: "" },
      images: { type: [String], default: [] },
      description: { type: String, default: "" },
      sku: { type: String, default: null },
      materials: { type: [String], default: [] },
      tags: { type: [String], default: [] },
      available: { type: Boolean, default: true },
      stock: { type: Number, default: 1 },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      createdAt: { type: Date, default: Date.now }
    });
    
    const Product = mongoose.model('Product', ProductSchema);
    
    // Check existing products
    const count = await Product.countDocuments();
    console.log(`📊 Current products in database: ${count}`);
    
    if (count > 0) {
      const products = await Product.find().limit(5);
      console.log('Sample products:', products.map(p => ({name: p.name, price: p.price})));
    }
    
    // If no products, create some sample products
    if (count === 0) {
      console.log('\n📝 Creating sample products...');
      
      const sampleProducts = [
        {
          name: 'Diamond Engagement Ring',
          price: 500000,
          category: 'Rings',
          image: '/uploads/ring1.jpg',
          description: 'Beautiful diamond engagement ring',
          stock: 5,
          available: true
        },
        {
          name: 'Gold Necklace',
          price: 150000,
          category: 'Necklaces',
          image: '/uploads/necklace1.jpg',
          description: 'Elegant 24k gold necklace',
          stock: 10,
          available: true
        },
        {
          name: 'Pearl Earrings',
          price: 75000,
          category: 'Earrings',
          image: '/uploads/earrings1.jpg',
          description: 'Luxurious pearl earrings',
          stock: 8,
          available: true
        },
        {
          name: 'Diamond Bracelet',
          price: 250000,
          category: 'Bracelets',
          image: '/uploads/bracelet1.jpg',
          description: 'Sparkling diamond bracelet',
          stock: 3,
          available: true
        },
        {
          name: 'Sapphire Ring',
          price: 350000,
          category: 'Rings',
          image: '/uploads/ring2.jpg',
          description: 'Stunning sapphire ring',
          stock: 4,
          available: true
        }
      ];
      
      const created = await Product.insertMany(sampleProducts);
      console.log(`✅ Created ${created.length} sample products`);
      
      created.forEach(p => {
        console.log(`  ✓ ${p.name} - ₦${p.price.toLocaleString()}`);
      });
    }
    
    mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.disconnect();
  }
}

await seedProducts();
