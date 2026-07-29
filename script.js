// ============================================
// SITE-WIDE SETTINGS: loads on every page (logo, headline, WhatsApp number,
// footer text, etc.) from site-settings.json — edited in /admin under
// "Site Settings". This is what makes the whole site editable from admin,
// not just the products.
// ============================================
fetch("site-settings.json")
  .then((res) => res.json())
  .then((s) => {
    document.querySelectorAll("#site-logo, #site-logo-footer").forEach((el) => {
      el.textContent = s.storeName || "";
    });

    const eyebrow = document.getElementById("hero-eyebrow");
    if (eyebrow) eyebrow.textContent = s.eyebrow || "";

    const headline = document.getElementById("hero-headline");
    if (headline && s.headline) {
      headline.innerHTML = s.headline
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("<br>");
    }

    const subtext = document.getElementById("hero-subtext");
    if (subtext) subtext.textContent = s.heroSubtext || "";

    const sectionTitle = document.getElementById("section-title");
    if (sectionTitle) sectionTitle.textContent = s.sectionTitle || "";

    const confirmNote = document.getElementById("confirm-note");
    if (confirmNote) confirmNote.textContent = s.confirmNote || "";

    const footerContact = document.getElementById("footer-contact");
    const whatsappLink = document.getElementById("whatsapp-link");
    if (whatsappLink && s.whatsappNumber) {
      whatsappLink.href = "https://wa.me/" + s.whatsappNumber;
      whatsappLink.textContent = "+" + s.whatsappNumber;
    }
    if (footerContact && s.footerNote) {
      footerContact.childNodes[0].textContent = s.footerNote + " ";
    }
  })
  .catch(() => {
    // If this fails, the hardcoded fallback text already in the HTML stays visible.
  });

// ============================================
// HOMEPAGE: load products from products.json (edited by the /admin panel)
// and build the product cards automatically.
// ============================================
const productGrid = document.getElementById("product-grid");
if (productGrid) {
  fetch("products.json")
    .then((res) => res.json())
    .then((data) => {
      const products = data.products || [];
      if (products.length === 0) {
        productGrid.innerHTML = '<p class="spec">No products yet.</p>';
        return;
      }
      productGrid.innerHTML = products
        .map((p) => {
          const orderUrl =
            "order.html?product=" +
            encodeURIComponent(p.name) +
            "&price=" +
            encodeURIComponent(p.price + " MAD");
          return `
            <article class="card">
              <div class="card-img">
                <img src="${p.image}" alt="${p.name}">
              </div>
              <div class="card-body">
                <h3>${p.name}</h3>
                <p class="spec">${p.spec || ""}</p>
                <div class="price">[ ${p.price} MAD ]</div>
                <a class="btn" href="${orderUrl}">Order Now</a>
              </div>
            </article>`;
        })
        .join("");
    })
    .catch(() => {
      productGrid.innerHTML = '<p class="spec">Could not load products right now.</p>';
    });
}

// ============================================
// ORDER PAGE
// Reads the product name & price from the link that was clicked (e.g. index.html -> "Order Now")
// and displays them at the top of the order page, and inside hidden form fields
// so they get included in the email you receive.
// ============================================

const params = new URLSearchParams(window.location.search);
const productName = params.get("product") || "Unknown product";
const productPrice = params.get("price") || "—";

const nameEl = document.getElementById("product-name");
const priceEl = document.getElementById("product-price");
if (nameEl) nameEl.textContent = productName;
if (priceEl) priceEl.textContent = productPrice;

const hiddenName = document.getElementById("hidden-product");
const hiddenPrice = document.getElementById("hidden-price");
if (hiddenName) hiddenName.value = productName;
if (hiddenPrice) hiddenPrice.value = productPrice;

// Show a friendly "Order received" message after Formspree accepts the submission,
// without leaving the page (keeps the flow feeling like one seamless purchase).
const form = document.getElementById("order-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        form.hidden = true;
        document.getElementById("success-message").hidden = false;
      } else {
        alert("Something went wrong sending your order. Please try again, or contact us on WhatsApp.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Order";
      }
    } catch (err) {
      alert("Network error. Please check your connection and try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Order";
    }
  });
}
