/**
 * Component Loader
 * Dynamically loads header and footer components into pages
 */

document.addEventListener("DOMContentLoaded", function () {
  // Load shared styles first
  if (!document.querySelector('link[href="/styles.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles.css';
    document.head.appendChild(link);
  }
  
  loadHeader();
  loadFooter();
});

async function loadHeader() {
  try {
    // Avoid inserting duplicate header if one already exists
    if (document.querySelector('header')) {
      console.log('[LOAD HEADER] Header already present in DOM — skipping insertion');
      return;
    }
    console.log("[LOAD HEADER] Starting to load header...");
    const response = await fetch("/header.html");
    if (!response.ok) throw new Error("Failed to load header");
    const headerHTML = await response.text();

    // Insert at the beginning of body or before main content
    const headerContainer = document.createElement("div");
    headerContainer.innerHTML = headerHTML;
    document.body.insertBefore(headerContainer, document.body.firstChild);
    console.log("[LOAD HEADER] Header inserted into DOM");

    // Initialize header functionality if needed
    initializeHeader();
    
    // Pre-render the cart so it's ready when user clicks
    console.log("[LOAD HEADER] Pre-rendering cart...");
    setTimeout(() => {
      renderCart();
    }, 100);
  } catch (error) {
    console.error("Error loading header:", error);
  }
}

async function loadFooter() {
  try {
    // Avoid inserting duplicate footer if one already exists
    if (document.querySelector('footer')) {
      console.log('[LOAD FOOTER] Footer already present in DOM — skipping insertion');
      return;
    }
    const response = await fetch("/footer.html");
    if (!response.ok) throw new Error("Failed to load footer");
    const footerHTML = await response.text();

    // Append at the end of body
    const footerContainer = document.createElement("div");
    footerContainer.innerHTML = footerHTML;
    document.body.appendChild(footerContainer);

    // Initialize footer functionality if needed
    initializeFooter();
  } catch (error) {
    console.error("Error loading footer:", error);
  }
}

function initializeHeader() {
  console.log("[INIT HEADER] Initializing header...");
  
  // Toggle cart
  const cartToggle = document.getElementById("cartToggle");
  console.log("[INIT HEADER] cartToggle element found:", !!cartToggle);
  
  if (cartToggle) {
    cartToggle.addEventListener("click", function () {
      console.log("[INIT HEADER] Cart toggle clicked!");
      const cartPanel = document.querySelector(".cart-panel");
      console.log("[INIT HEADER] cartPanel found:", !!cartPanel);
      
      if (cartPanel) {
        cartPanel.classList.toggle("active");
        console.log("[INIT HEADER] Cart panel toggled, active:", cartPanel.classList.contains("active"));
        // Add a small delay to ensure DOM is ready
        setTimeout(() => renderCart(), 50);
      }
    });
  }

  // Close cart button
  const cartClose = document.getElementById("cartClose");
  console.log("[INIT HEADER] cartClose element found:", !!cartClose);
  
  if (cartClose) {
    cartClose.addEventListener("click", function () {
      console.log("[INIT HEADER] Cart close clicked!");
      const cartPanel = document.querySelector(".cart-panel");
      if (cartPanel) {
        cartPanel.classList.remove("active");
      }
    });
  }

  // Dark mode toggle
  const darkToggle = document.getElementById("darkToggle");
  if (darkToggle) {
    darkToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem(
        "darkMode",
        document.body.classList.contains("dark-mode")
      );
    });

    // Restore dark mode preference
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark-mode");
    }
  }

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        // Handle search - can be extended with actual search logic
        console.log("Search for:", this.value);
      }
    });
  }

  // Update cart count
  updateCartCount();
  
  // Listen for cart updates from CartManager (on both window and document for compatibility)
  window.addEventListener('cartUpdated', function() {
    console.log("[INIT HEADER] 🛒 Cart updated event received");
    updateCartCount();
    
    // If cart is visible, re-render it
    const cartPanel = document.querySelector(".cart-panel");
    if (cartPanel && cartPanel.classList.contains("active")) {
      console.log("[INIT HEADER] Cart is open, re-rendering items");
      renderCart();
    }
  });
  
  document.addEventListener('cartUpdated', function() {
    console.log("[INIT HEADER] 🛒 Cart updated event received (document)");
    updateCartCount();
    
    // If cart is visible, re-render it
    const cartPanel = document.querySelector(".cart-panel");
    if (cartPanel && cartPanel.classList.contains("active")) {
      console.log("[INIT HEADER] Cart is open, re-rendering items");
      renderCart();
    }
  });
}

function initializeFooter() {
  // Newsletter subscription
  const newsletterForm = document.getElementById("newsletterForm");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      handleNewsletterSubscribe(e);
    });
  }
}

function updateCartCount() {
  const cartCountEl = document.getElementById("cartCount");
  if (!cartCountEl) return;

  const authToken = localStorage.getItem("authToken");
  
  if (authToken) {
    // Load from backend if logged in
    loadCartFromBackend().then(cart => {
      const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
      cartCountEl.textContent = count;
    });
  } else {
    // Load from localStorage if not logged in
    const cart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
    const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    cartCountEl.textContent = count;
  }
}

function renderCart() {
  console.log("[RENDER CART] 📍 Starting renderCart()...");
  
  // Wait for cart elements to exist
  waitForCartElements().then(({ cartItems, cartEmpty, cartSummary }) => {
    console.log("[RENDER CART] ✅ Cart elements found, proceeding...");
    
    const authToken = localStorage.getItem("authToken");
    console.log("[RENDER CART] Auth token exists:", !!authToken);
    
    if (authToken) {
      console.log("[RENDER CART] 🔄 Loading cart from backend...");
      loadCartFromBackend().then(cart => {
        console.log("[RENDER CART] ✅ Backend cart data received:", cart);
        
        if (cart && cart.length > 0) {
          console.log("[RENDER CART] 📦 Found", cart.length, 'items in backend');
        } else {
          console.log("[RENDER CART] 📭 Backend cart is empty or null");
        }
        
        displayCartItems(cart, cartItems, cartEmpty, cartSummary);
      }).catch(error => {
        console.error("[RENDER CART] ❌ Error loading from backend:", error);
        // Fallback to localStorage
        const cart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
        console.log("[RENDER CART] 📚 Falling back to localStorage:", cart.length, 'items');
        displayCartItems(cart, cartItems, cartEmpty, cartSummary);
      });
    } else {
      console.log("[RENDER CART] 👤 No auth token, loading from localStorage...");
      const cart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
      console.log("[RENDER CART] 📚 LocalStorage cart:", cart.length, 'items');
      displayCartItems(cart, cartItems, cartEmpty, cartSummary);
    }
  }).catch(error => {
    console.error("[RENDER CART] ❌ Failed to find cart elements:", error);
  });
}

function waitForCartElements(maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkElements = () => {
      attempts++;
      console.log("[WAIT ELEMENTS] Attempt", attempts, "checking for cart elements...");
      
      const cartItems = document.getElementById("cartItems");
      const cartEmpty = document.getElementById("cartEmpty");
      const cartSummary = document.getElementById("cartSummary");
      
      if (cartItems && cartEmpty && cartSummary) {
        console.log("[WAIT ELEMENTS] All cart elements found!");
        resolve({ cartItems, cartEmpty, cartSummary });
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error("[WAIT ELEMENTS] Cart elements not found after", maxAttempts, "attempts");
        reject(new Error("Cart elements not found"));
        return;
      }
      
      // Wait 50ms and try again
      setTimeout(checkElements, 50);
    };
    
    checkElements();
  });
}

async function loadCartFromBackend() {
  try {
    const authToken = localStorage.getItem("authToken");
    console.log("[CART API] 📍 Starting loadCartFromBackend()");
    console.log("[CART API] Auth token:", authToken ? authToken.substring(0, 20) + "..." : "null");
    
    if (!authToken) {
      console.log("[CART API] ❌ No auth token found - returning empty array");
      return [];
    }

    console.log("[CART API] 🔄 Fetching cart from /api/customer/cart");
    const response = await fetch("/api/customer/cart", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      credentials: "same-origin"
    });

    console.log("[CART API] 📊 Response status:", response.status);
    console.log("[CART API] Response type:", response.type);
    console.log("[CART API] Response OK:", response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CART API] ❌ Failed to load cart. Status:", response.status);
      console.error("[CART API] Error response:", errorText);
      return [];
    }

    const text = await response.text();
    console.log("[CART API] 📝 Raw response text:", text);
    
    const data = JSON.parse(text);
    console.log("[CART API] ✅ Parsed JSON:", JSON.stringify(data, null, 2));
    
    // Handle different response formats
    if (Array.isArray(data)) {
      console.log("[CART API] ✅ Response is array, returning directly with", data.length, 'items');
      return data;
    }
    if (data.items && Array.isArray(data.items)) {
      console.log("[CART API] ✅ Found data.items array with", data.items.length, "items");
      return data.items;
    }
    if (data.cart && Array.isArray(data.cart)) {
      console.log("[CART API] ✅ Found data.cart array with", data.cart.length, "items");
      return data.cart;
    }
    if (data.data && Array.isArray(data.data)) {
      console.log("[CART API] ✅ Found data.data array with", data.data.length, "items");
      return data.data;
    }
    
    console.warn("[CART API] ⚠️ Unexpected response format. Full data:", data);
    console.warn("[CART API] ⚠️ Data keys:", Object.keys(data));
    return [];
  } catch (error) {
    console.error("[CART API] ❌ Exception occurred:");
    console.error("[CART API] Error message:", error.message);
    console.error("[CART API] Error stack:", error.stack);
    return [];
  }
}

function displayCartItems(cart, cartItems, cartEmpty, cartSummary) {
  console.log("[DISPLAY CART] 📍 Starting displayCartItems()");
  console.log("[DISPLAY CART] Cart data:", cart);
  console.log("[DISPLAY CART] Cart length:", cart?.length || 0);
  console.log("[DISPLAY CART] cartItems element:", !!cartItems, "(type:", typeof cartItems, ")");
  console.log("[DISPLAY CART] cartEmpty element:", !!cartEmpty);
  console.log("[DISPLAY CART] cartSummary element:", !!cartSummary);
  
  // Double check elements exist
  if (!cartItems) {
    console.error("[DISPLAY CART] ❌ cartItems element missing, trying to find it...");
    cartItems = document.getElementById("cartItems");
    console.log("[DISPLAY CART] After querySelector:", !!cartItems);
  }
  if (!cartEmpty) {
    console.log("[DISPLAY CART] ⚠️ cartEmpty element missing, trying to find it...");
    cartEmpty = document.getElementById("cartEmpty");
  }
  if (!cartSummary) {
    console.log("[DISPLAY CART] ⚠️ cartSummary element missing, trying to find it...");
    cartSummary = document.getElementById("cartSummary");
  }
  
  if (!cart || cart.length === 0) {
    console.log("[DISPLAY CART] 📭 Cart is empty, showing empty state");
    if (cartItems) {
      cartItems.innerHTML = "";
      console.log("[DISPLAY CART] ✅ Cleared cartItems HTML");
    }
    if (cartEmpty) {
      cartEmpty.style.display = "block";
      console.log("[DISPLAY CART] ✅ Showed cartEmpty message");
    }
    if (cartSummary) {
      cartSummary.style.display = "none";
      console.log("[DISPLAY CART] ✅ Hid cartSummary");
    }
    
    // Update total to 0
    const totalEl = document.getElementById("cartTotal");
    if (totalEl) {
      totalEl.textContent = "₦0.00";
      console.log("[DISPLAY CART] ✅ Updated total to 0");
    }
    
    return;
  }

  console.log("[DISPLAY CART] 📦 Rendering", cart.length, "items");
  if (cartEmpty) {
    cartEmpty.style.display = "none";
    console.log("[DISPLAY CART] ✅ Hid cartEmpty");
  }
  if (cartSummary) {
    cartSummary.style.display = "block";
    console.log("[DISPLAY CART] ✅ Showed cartSummary");
  }

  if (!cartItems) {
    console.error("[DISPLAY CART] ❌ CRITICAL: cartItems element is still null!");
    return;
  }

  const itemsHTML = cart.map(item => {
    const itemId = item._id || item.id;
    const qty = item.qty || 1;
    const price = item.price || 0;
    const name = item.name || 'Product';
    
    console.log("[DISPLAY CART] Rendering item:", name, "- Qty:", qty, "- Price:", price);
    
    return `
      <li class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${name}</div>
          <div class="cart-item-price">₦${price.toLocaleString('en-US')}</div>
          <div class="cart-item-controls">
            <button onclick="updateCartQty('${itemId}', ${qty - 1})">−</button>
            <span style="min-width: 30px; text-align: center;">${qty}</span>
            <button onclick="updateCartQty('${itemId}', ${qty + 1})">+</button>
            <button onclick="removeFromCart('${itemId}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </li>
    `;
  }).join("");
  
  console.log("[DISPLAY CART] 📝 Generated HTML length:", itemsHTML.length);
  cartItems.innerHTML = itemsHTML;
  console.log("[DISPLAY CART] ✅ Items HTML set into DOM");

  // Update total
  const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);
  const totalEl = document.getElementById("cartTotal");
  console.log("[DISPLAY CART] 💰 Calculated total:", total, "- Total element exists:", !!totalEl);
  
  if (totalEl) {
    const formattedTotal = "₦" + total.toLocaleString('en-US');
    totalEl.textContent = formattedTotal;
    console.log("[DISPLAY CART] ✅ Updated cartTotal to:", formattedTotal);
    console.log("[DISPLAY CART] Total updated to:", formattedTotal);
  } else {
    console.error("[DISPLAY CART] cartTotal element not found!");
  }
}

function updateCartQty(productId, newQty) {
  if (newQty < 1) {
    removeFromCart(productId);
    return;
  }

  const authToken = localStorage.getItem("authToken");
  
  if (authToken) {
    // Update on backend
    updateCartQtyBackend(productId, newQty);
  } else {
    // Update locally
    const cart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
    const item = cart.find(i => i._id === productId || i.id === productId);
    
    if (item) {
      item.qty = newQty;
      localStorage.setItem("CART_v1", JSON.stringify(cart));
      updateCartCount();
      renderCart();
    }
  }
}

async function updateCartQtyBackend(productId, qty) {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch("/api/customer/cart", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: productId,
        qty: qty
      })
    });

    if (response.ok) {
      updateCartCount();
      renderCart();
    }
  } catch (error) {
    console.error("[CART] Error updating quantity on backend:", error);
  }
}

function removeFromCart(productId) {
  const authToken = localStorage.getItem("authToken");
  
  if (authToken) {
    // Remove from backend
    removeFromCartBackend(productId);
  } else {
    // Remove locally
    const cart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
    const filtered = cart.filter(i => i._id !== productId && i.id !== productId);
    localStorage.setItem("CART_v1", JSON.stringify(filtered));
    updateCartCount();
    renderCart();
  }
}

async function removeFromCartBackend(productId) {
  try {
    const authToken = localStorage.getItem("authToken");
    const response = await fetch(`/api/customer/cart/${productId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      updateCartCount();
      renderCart();
    }
  } catch (error) {
    console.error("[CART] Error removing from backend:", error);
  }
}

// Listen for cart updates
window.addEventListener("cartUpdated", function () {
  console.log("[EVENT] cartUpdated event received");
  updateCartCount();
  // Also re-render cart if it's visible
  const cartPanel = document.querySelector(".cart-panel");
  if (cartPanel && cartPanel.classList.contains("active")) {
    console.log("[EVENT] Cart panel is active, re-rendering...");
    renderCart();
  }
});

// Debug function for console testing
window.debugCart = async function() {
  console.log("=== CART DEBUG ===");
  const authToken = localStorage.getItem("authToken");
  console.log("Auth Token:", authToken ? authToken.substring(0, 20) + "..." : "null");
  
  if (authToken) {
    console.log("Fetching cart from backend...");
    const result = await loadCartFromBackend();
    console.log("Backend cart result:", result);
  }
  
  const localCart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
  console.log("Local storage cart:", localCart);
  
  const cartItems = document.getElementById("cartItems");
  console.log("cartItems element:", cartItems);
  console.log("cartItems HTML:", cartItems?.innerHTML || "N/A");
  
  console.log("=== END DEBUG ===");
};
function addEmailInput() {
  const container = document.getElementById("emailInputsContainer");
  if (!container) return;

  const emailCount = container.querySelectorAll("input[type='email']").length;
  if (emailCount >= 5) {
    showNewsletterMessage("Maximum 5 emails allowed", "error");
    return;
  }

  const newInput = document.createElement("div");
  newInput.className = "input-icon-wrapper email-input-group";
  newInput.style.position = "relative";
  newInput.innerHTML = `
    <i class="fas fa-envelope field-icon"></i>
    <input
      type="email"
      class="newsletterEmail"
      placeholder="Another email"
      style="
        width: 100%;
        padding: 12px 12px 12px 40px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-family: 'Poppins', sans-serif;
        font-size: 0.95rem;
        transition: all 0.3s ease;
      "
      onfocus="this.style.borderColor='#d4af37'; this.style.backgroundColor='rgba(255,255,255,0.2)'"
      onblur="this.style.borderColor='rgba(255,255,255,0.3)'; this.style.backgroundColor='rgba(255,255,255,0.1)'"
    />
    <button
      type="button"
      style="
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(220, 53, 69, 0.3);
        color: #dc3545;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.85rem;
      "
      onclick="removeEmailInput(this.parentElement)"
      onmouseover="this.style.backgroundColor='rgba(220, 53, 69, 0.5)'"
      onmouseout="this.style.backgroundColor='rgba(220, 53, 69, 0.3)'"
    >
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(newInput);
}

// Remove an email input field
function removeEmailInput(element) {
  element.remove();
}

// Handle newsletter subscription
async function handleNewsletterSubscribe(event) {
  event.preventDefault();
  const messageEl = document.getElementById("newsletterMessage");
  const emailInputs = document.querySelectorAll(".newsletterEmail");

  if (!messageEl || emailInputs.length === 0) return;

  // Collect all emails
  const emails = Array.from(emailInputs)
    .map(input => input.value.trim())
    .filter(email => email.length > 0);

  if (emails.length === 0) {
    showNewsletterMessage("Please enter at least one email", "error");
    return;
  }

  // Validate all emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter(email => !emailRegex.test(email));
  if (invalidEmails.length > 0) {
    showNewsletterMessage(
      `Invalid email(s): ${invalidEmails.join(", ")}`,
      "error"
    );
    return;
  }

  try {
    // Subscribe each email
    const results = await Promise.all(
      emails.map(email =>
        fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
      )
    );

    const allSuccess = results.every(res => res.ok);

    if (allSuccess) {
      showNewsletterMessage(
        `✓ Successfully subscribed ${emails.length} email(s)! Check your inbox.`,
        "success"
      );
      emailInputs.forEach(input => input.value = "");
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 5000);
    } else {
      showNewsletterMessage(
        "Some emails failed to subscribe. Please try again.",
        "error"
      );
    }
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    showNewsletterMessage(
      "An error occurred. Please try again later.",
      "error"
    );
  }
}

function showNewsletterMessage(message, type) {
  const messageEl = document.getElementById("newsletterMessage");
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.style.display = "block";
  messageEl.style.backgroundColor =
    type === "success" ? "rgba(40, 167, 69, 0.2)" : "rgba(220, 53, 69, 0.2)";
  messageEl.style.color = type === "success" ? "#28a745" : "#dc3545";
}

// Debug cart function for console
window.debugCart = async function() {
  console.log("=== CART DEBUG INFO ===");
  
  const authToken = localStorage.getItem("authToken");
  console.log("Auth Token Present:", !!authToken);
  if (authToken) {
    console.log("Token Preview:", authToken.substring(0, 30) + "...");
  }
  
  const localCart = JSON.parse(localStorage.getItem("CART_v1") || "[]");
  console.log("LocalStorage Cart:", localCart);
  
  if (authToken) {
    console.log("Fetching backend cart...");
    const backendCart = await loadCartFromBackend();
    console.log("Backend Cart:", backendCart);
  }
  
  const cartElements = {
    cartToggle: !!document.getElementById("cartToggle"),
    cartPanel: !!document.querySelector(".cart-panel"),
    cartItems: !!document.getElementById("cartItems"),
    cartEmpty: !!document.getElementById("cartEmpty"),
    cartSummary: !!document.getElementById("cartSummary"),
    cartTotal: !!document.getElementById("cartTotal"),
  };
  console.log("Cart Elements Found:", cartElements);
  
  console.log("=== END DEBUG ===");
};

