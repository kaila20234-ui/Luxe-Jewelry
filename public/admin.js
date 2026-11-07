(function () {
  const productForm = document.getElementById("productForm") || document.getElementById("uploadForm");
  if (!productForm) {
    console.log("[admin.js] No matching admin upload form found; skipping admin.js initialization.");
    return;
  }

  if (productForm.dataset.adminJsInit === "true") {
    return;
  }
  productForm.dataset.adminJsInit = "true";

  const getInput = (ids) => ids.reduce((found, id) => found || document.getElementById(id), null);
  const nameInput = getInput(["productName", "name"]);
  const priceInput = getInput(["productPrice", "price"]);
  const categoryInput = getInput(["productCategory", "category"]);
  const imageInput = getInput(["productImage", "image"]);
  const productPreview = document.getElementById("productPreview");
  const previewSection = document.getElementById("preview");
  const previewContainer = productPreview || previewSection;

  if (!nameInput || !priceInput || !categoryInput || !imageInput) {
    console.warn("[admin.js] Missing required upload fields; admin.js upload handler will not attach.");
    return;
  }

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const category = categoryInput.value.trim();
    const file = imageInput.files[0];

    if (!name || !price || !category) {
      alert("⚠️ Please fill all fields before uploading.");
      return;
    }

    if (!file) {
      alert("⚠️ Please select an image to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("image", file);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("✅ Product uploaded successfully!");
        productForm.reset();
        loadProducts();
      } else {
        console.error("Server Error:", data);
        alert("❌ Upload failed. Please check server logs for details.");
      }
    } catch (error) {
      console.error("Network Error:", error);
      alert("⚠️ Could not connect to server. Is your backend running?");
    }
  });

  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      const products = await res.json();
      const preview = previewContainer;

      if (!preview) {
        return;
      }

      if (!Array.isArray(products) || products.length === 0) {
        preview.innerHTML = "<li>No products found.</li>";
        return;
      }

      preview.innerHTML = products
        .map((p) => {
          const imageUrl = p.image
            ? p.image.startsWith("http") || p.image.startsWith("/")
              ? p.image
              : "/uploads/" + p.image
            : "/placeholder.png";

          return `
            <li>
              <img src="${imageUrl}" alt="${p.name}" width="60" />
              ${p.name} — ₦${Number(p.price).toLocaleString()} (${p.category || "Uncategorized"})
            </li>`;
        })
        .join("");
    } catch (error) {
      console.error("Error loading products:", error);
      if (previewContainer) {
        previewContainer.innerHTML = "<li>⚠️ Unable to load products.</li>";
      }
    }
  }

  loadProducts();
})();
