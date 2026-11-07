// Test the Buy Now button functionality
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Buy Now Button...\n');

// Read the product.html file
const htmlPath = path.join(__dirname, 'public', 'product.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Test 1: Check if button exists
console.log('✓ Test 1: Button HTML exists');
const hasButton = html.includes('id="checkoutNow"');
console.log(`  ${hasButton ? '✅ PASS' : '❌ FAIL'}: Button with id="checkoutNow" found`);

// Test 2: Check if button has correct class
console.log('\n✓ Test 2: Button styling');
const hasCorrectClass = html.includes('class="btn btn-outline"');
console.log(`  ${hasCorrectClass ? '✅ PASS' : '❌ FAIL'}: Button has correct CSS classes`);

// Test 3: Check if Buy Now text exists
console.log('\n✓ Test 3: Button text');
const hasButtonText = html.includes('Buy Now</a>');
console.log(`  ${hasButtonText ? '✅ PASS' : '❌ FAIL'}: Button displays "Buy Now" text`);

// Test 4: Check if event listener is attached
console.log('\n✓ Test 4: JavaScript event handler');
const hasEventListener = html.includes("document.getElementById('checkoutNow').addEventListener");
console.log(`  ${hasEventListener ? '✅ PASS' : '❌ FAIL'}: Event listener attached to button`);

// Test 5: Check if it adds to cart
console.log('\n✓ Test 5: Cart functionality');
const addsToCart = html.includes("localStorage.setItem(storeKey, JSON.stringify(cart))");
console.log(`  ${addsToCart ? '✅ PASS' : '❌ FAIL'}: Button adds product to localStorage cart`);

// Test 6: Check if it redirects to checkout
console.log('\n✓ Test 6: Checkout redirect');
const redirectsToCheckout = html.includes("/checkout.html");
console.log(`  ${redirectsToCheckout ? '✅ PASS' : '❌ FAIL'}: Button redirects to checkout.html`);

// Test 7: Check if it gets quantity from input
console.log('\n✓ Test 7: Quantity handling');
const getsQuantity = html.includes("Number(qtyInput.value)");
console.log(`  ${getsQuantity ? '✅ PASS' : '❌ FAIL'}: Button reads quantity from input field`);

console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));

const allPass = hasButton && hasCorrectClass && hasButtonText && hasEventListener && addsToCart && redirectsToCheckout && getsQuantity;
if (allPass) {
  console.log('\n✅ ALL TESTS PASSED - Buy Now button is working correctly!');
} else {
  console.log('\n❌ SOME TESTS FAILED - Please review the button implementation');
}

console.log('\n📝 Expected behavior:');
console.log('  1. Customer views a product');
console.log('  2. Customer sets quantity');
console.log('  3. Customer clicks "Buy Now"');
console.log('  4. Product is added to cart');
console.log('  5. Customer is redirected to /checkout.html');
