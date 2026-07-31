// ============================================
// O MARKET — site script
// Loads editable content from site-settings.json (logo, headline, WhatsApp
// number, footer, announcement bar) and the catalog from products.json —
// both edited from /admin — and renders them into the page.
// ============================================

// Cache-busting query param so admin edits show up immediately instead of
// waiting on a stale cached copy of the JSON files. Also checks res.ok so a
// failed request never silently hangs on "Loading..." forever.
function freshFetch(path) {
  return fetch(path + "?v=" + Date.now()).then((res) => {
    if (!res.ok) throw new Error(path + " responded with status " + res.status);
    return res.json();
  });
}

// ---- Site-wide settings ----
freshFetch("site-settings.json")
  .then((s) => {
    document.querySelectorAll("#site-logo, #site-logo-footer").forEach((el) => {
      if (s.storeName) el.textContent = s.storeName;
    });

    const tagline = document.getElementById("site-tagline");
    if (tagline && s.tagline) tagline.textContent = s.tagline;

    const announcement = document.getElementById("announcement-text");
    if (announcement && s.announcement) announcement.textContent = s.announcement;

    const eyebrow = document.getElementById("hero-eyebrow");
    if (eyebrow && s.eyebrow) eyebrow.textContent = s.eyebrow;

    const headline = document.getElementById("hero-headline");
    if (headline && s.headline) {
      headline.innerHTML = s.headline
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("<br>");
    }

    const subtext = document.getElementById("hero-subtext");
    if (subtext && s.heroSubtext) subtext.textContent = s.heroSubtext;

    const sectionTitle = document.getElementById("section-title");
    if (sectionTitle && s.sectionTitle) sectionTitle.textContent = s.sectionTitle;

    const confirmNote = document.getElementById("confirm-note");
    if (confirmNote && s.confirmNote) confirmNote.textContent = s.confirmNote;

    const footerContact = document.getElementById("footer-contact");
    const whatsappLink = document.getElementById("whatsapp-link");
    if (whatsappLink && s.whatsappNumber) {
      whatsappLink.href = "https://wa.me/" + s.whatsappNumber;
      whatsappLink.textContent = "+" + s.whatsappNumber;
    }
    if (footerContact && s.footerNote && footerContact.childNodes[0]) {
      footerContact.childNodes[0].textContent = s.footerNote + " ";
    }
  })
  .catch((err) => {
    // If this fails, the fallback text already written into the HTML stays visible.
    console.warn("Site settings did not load, showing fallback text:", err);
  });

// ---- Product catalog (homepage only) ----
const productGrid = document.getElementById("product-grid");
if (productGrid) {
  freshFetch("products.json")
    .then((data) => {
      const products = data.products || [];
      if (products.length === 0) {
        productGrid.innerHTML = '<p class="grid-message">Aucun produit pour le moment.</p>';
        return;
      }
      productGrid.innerHTML = products.map(renderCard).join("");
    })
    .catch((err) => {
      productGrid.innerHTML =
        '<p class="grid-message">Impossible de charger les produits pour le moment. Rechargez la page dans un instant.</p>';
      console.error("Product load failed:", err);
    });
}

function renderCard(p) {
  const orderUrl =
    "order.html?product=" +
    encodeURIComponent(p.name) +
    "&price=" +
    encodeURIComponent(p.price + " DH");

  const badge = p.badge ? `<span class="badge">${p.badge}</span>` : "";

  const oldPrice =
    p.oldPrice && p.oldPrice > p.price
      ? `<span class="price-old">${p.oldPrice} DH</span>`
      : "";

  // encodeURI protects against filenames with raw spaces breaking the image request
  const imageSrc = p.image ? encodeURI(p.image) : "";

  return `
    <article class="card">
      <div class="card-img">
        ${badge}
        <img src="${imageSrc}" alt="${p.name}" loading="lazy">
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <p class="spec">${p.spec || ""}</p>
        <div class="price-row">
          <span class="price">${p.price} DH</span>
          ${oldPrice}
        </div>
        <a class="btn" href="${orderUrl}">Commander</a>
      </div>
    </article>`;
}

// ============================================
// ORDER PAGE
// Reads the product name & price from the link that was clicked and shows
// them at the top of the order page + inside hidden form fields so they're
// included in the email you receive.
// ============================================
const params = new URLSearchParams(window.location.search);
const productName = params.get("product") || "Produit";
const productPrice = params.get("price") || "—";

const nameEl = document.getElementById("product-name");
const priceEl = document.getElementById("product-price");
if (nameEl) nameEl.textContent = productName;
if (priceEl) priceEl.textContent = productPrice;

const hiddenName = document.getElementById("hidden-product");
const hiddenPrice = document.getElementById("hidden-price");
if (hiddenName) hiddenName.value = productName;
if (hiddenPrice) hiddenPrice.value = productPrice;

// Shows a friendly "Order received" message after Formspree accepts the
// submission, without leaving the page.
const form = document.getElementById("order-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        form.style.display = "none";
        const success = document.getElementById("success-message");
        success.hidden = false;
        success.style.display = "block";
      } else {
        alert("Un problème est survenu lors de l'envoi. Réessayez, ou contactez-nous sur WhatsApp.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmer la commande";
      }
    } catch (err) {
      alert("Erreur réseau. Vérifiez votre connexion et réessayez.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmer la commande";
    }
  });
}
