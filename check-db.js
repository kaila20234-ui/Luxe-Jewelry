#!/usr/bin/env node

const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/luxe_jewelry')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.log('❌ Connection error:', err.message);
    process.exit(1);
  });

// Define Product schema
const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  image: String,
  stock: Number,
  rating: Number,
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

async function checkProducts() {
  try {
    const count = await Product.countDocuments();
    console.log(`\n📊 Total products in database: ${count}\n`);
    
    if (count === 0) {
      console.log('Database is empty. Seeding sample data...\n');
      
      const sampleProducts = [
        {
          name: 'Diamond Ring',
          description: 'Beautiful diamond engagement ring',
          price: 150000,
          category: 'Rings',
          stock: 5,
          rating: 4.8
        },
        {
          name: 'Gold Necklace',
          description: 'Elegant 18K gold necklace',
          price: 45000,
          category: 'Necklaces',
          stock: 12,
          rating: 4.6
        },
        {
          name: 'Pearl Earrings',
          description: 'Lustrous pearl drop earrings',
          price: 25000,
          category: 'Earrings',
          stock: 8,
          rating: 4.7
        },
        {
          name: 'Sapphire Bracelet',
          description: 'Stunning blue sapphire bracelet',
          price: 85000,
          category: 'Bracelets',
          stock: 4,
          rating: 4.9
        },
        {
          name: 'Silver Pendant',
          description: 'Handcrafted silver pendant',
          price: 15000,
          category: 'Pendants',
          stock: 15,
          rating: 4.5
        }
      ];
      
      const inserted = await Product.insertMany(sampleProducts);
      console.log(`✅ Inserted ${inserted.length} products\n`);
      
      // Display inserted products
      const products = await Product.find();
      products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} - NGN ${p.price.toLocaleString()} (Stock: ${p.stock})`);
      });
    } else {
      console.log('✅ Products found:\n');
      const products = await Product.find();
      products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} - NGN ${p.price.toLocaleString()} (${p.category})`);
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (err) {
    console.log('❌ Error:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkProducts();
