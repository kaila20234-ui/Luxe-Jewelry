#!/usr/bin/env node
/**
 * Quick API test script
 */

const http = require('http');

function testAPI(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data.substring(0, 100) });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('\n🧪 Testing Products API...\n');
  
  try {
    console.log('Connecting to http://localhost:5000/api/products...');
    const result = await testAPI('http://localhost:5000/api/products');
    
    console.log(`✅ Status: ${result.status}`);
    
    if (Array.isArray(result.data)) {
      console.log(`✅ Found ${result.data.length} products`);
      
      if (result.data.length > 0) {
        console.log('\n📦 Sample Products:');
        result.data.slice(0, 5).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name || 'Unknown'} - ${p.price || 'N/A'} (${p.category || 'N/A'})`);
        });
      } else {
        console.log('⚠️  No products in database');
      }
    } else if (result.data.message) {
      console.log(`⚠️  API Response: ${result.data.message}`);
    } else {
      console.log('✅ API Response received');
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    console.log('Is the server running on port 5000?');
  }
}

run();
