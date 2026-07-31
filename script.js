// ============================================================
// O MARKET v2 — site script
// 1. Loads editable content from site-settings.json, products.json,
//    faq.json and testimonials.json (all edited from /admin).
// 2. FR / AR (Darija) language toggle — content strings are
//    bilingual objects { fr, ar } inside site-settings.json.
// 3. Order page: reads product + price from the URL, computes a
//    live total, and posts the order to Formspree.
// ============================================================

"use strict";

/* ---------- helpers ---------- */

function freshFetch(path) {
  return fetch(path + "?v=" + Date.now()).then((res) => {
    if (!res.ok) throw new Error(path + " responded with " + res.status);
    return res.json();
  });
}

// Build a DOM element. Everything rendered by this script uses
// textContent (never HTML strings) so admin content can never
// inject markup or break the page.
function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

/* ---------- language state ---------- */

const LANG_KEY = "omarket-lang";
let lang = "fr";
try {
  lang = localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "fr";
} catch (e) { /* storage unavailable */ }

// A string field can be either a plain string (e.g. "OMARKET")
// or a bilingual object { fr, ar }. Arabic falls back to French
// whenever the Arabic version is missing or empty.
function pick(s, l) {
  if (s == null) return "";
  if (typeof s === "object") return s[l] || s.fr || "";
  return String(s);
}

/* ---------- static labels (code-owned, fully bilingual) ---------- */

const I18N = {
  navProducts:     { fr: "Produits",             ar: "المنتجات" },
  navHow:          { fr: "Comment ça marche",    ar: "كيف تطلب" },
  navFaq:          { fr: "FAQ",                  ar: "الأسئلة" },
  navContact:      { fr: "Contact",              ar: "اتصل بنا" },
  chipPayment:     { fr: "Paiement à la livraison", ar: "الدفع عند الاستلام" },
  chipDelivery:    { fr: "Livraison gratuite",   ar: "التوصيل مجاني" },
  chipTime:        { fr: "Livraison 24-72h",     ar: "توصيل 24-72 ساعة" },
  commandButton:   { fr: "Commander",            ar: "اطلب الآن" },
  filterAll:       { fr: "Tous",                 ar: "الكل" },
  emptyCat:        { fr: "Aucun produit dans cette catégorie pour le moment.", ar: "لا توجد منتجات في هذه الفئة حالياً." },
  loadError:       { fr: "Impossible de charger les produits. Rechargez la page dans un instant.", ar: "تعذر تحميل المنتجات. أعد تحميل الصفحة بعد قليل." },
  soldOut:         { fr: "Épuisé",               ar: "نفد" },
  inStock:         { fr: "En stock",             ar: "متوفر" },
  waDefaultText:   { fr: "Bonjour, j'ai une question sur un produit de votre boutique.", ar: "السلام عليكم، عندي سؤال عن منتج في متجركم." },

  orderBack:       { fr: "Retour au catalogue",  ar: "العودة إلى الكتالوج" },
  orderTitle:      { fr: "Confirmez votre commande", ar: "تأكيد الطلب" },
  orderEyebrow:    { fr: "Paiement à la livraison — payez à la réception", ar: "الدفع عند الاستلام — ادفع عند الوصول" },
  summaryProduct:  { fr: "Article",              ar: "المنتج" },
  summaryPrice:    { fr: "Prix",                 ar: "السعر" },
  summaryQty:      { fr: "Quantité",             ar: "الكمية" },
  summaryTotal:    { fr: "Total",                ar: "المجموع" },
  summaryDelivery: { fr: "Livraison",            ar: "التوصيل" },
  labelName:       { fr: "Nom complet",          ar: "الاسم الكامل" },
  labelPhone:      { fr: "Numéro de téléphone",  ar: "رقم الهاتف" },
  labelCity:       { fr: "Ville",                ar: "المدينة" },
  labelAddress:    { fr: "Adresse complète de livraison", ar: "العنوان الكامل للتوصيل" },
  labelQty:        { fr: "Quantité",             ar: "الكمية" },
  labelNotes:      { fr: "Remarques (optionnel)", ar: "ملاحظات (اختياري)" },
  placeholderName:    { fr: "ex. Othmane El Amrani", ar: "مثال: عثمان العلمي" },
  placeholderPhone:   { fr: "06XXXXXXXX",        ar: "06XXXXXXXX" },
  placeholderCity:    { fr: "ex. Kénitra",       ar: "مثال: القنيطرة" },
  placeholderAddress: { fr: "Rue, immeuble, étage, point de repère…", ar: "الشارع، العمارة، الطابق، علامة مميزة…" },
  placeholderNotes:   { fr: "Couleur préférée, heure de livraison, autre…", ar: "اللون المفضل، وقت التوصيل، …" },
  submitOrder:     { fr: "Confirmer la commande", ar: "تأكيد الطلب" },
  submitting:      { fr: "Envoi en cours…",      ar: "جارٍ الإرسال…" },
  fail:            { fr: "Une erreur est survenue. Réessayez ou contactez-nous sur WhatsApp.", ar: "حدث خطأ. أعد المحاولة أو تواصل معنا عبر واتساب." },
  successBack:     { fr: "Retour au catalogue",  ar: "العودة إلى الكتالوج" },
  footerRights:    { fr: "Tous droits réservés.", ar: "جميع الحقوق محفوظة." }
};

function t(key) {
  const entry = I18N[key];
  return entry ? entry[lang] || entry.fr : "";
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.body.classList.toggle("lang-ar", lang === "ar");

  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.textContent = lang === "ar" ? "FR" : "ع";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (I18N[key]) el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (I18N[key]) el.placeholder = t(key);
  });
}

/* ---------- site settings ---------- */

let settings = null;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = value;
}

function renderTrustBadges() {
  const wrap = document.getElementById("trust-grid");
  if (!wrap) return;
  const items = Array.isArray(settings.trustBadges) ? settings.trustBadges : [];
  wrap.innerHTML = "";
  items.forEach((b) => {
    const item = h("div", "trust-item");
    item.appendChild(h("span", "trust-icon", b.icon || "•"));
    const box = h("div");
    box.appendChild(h("h4", null, pick(b.title, lang)));
    box.appendChild(h("p", null, pick(b.sub, lang)));
    item.appendChild(box);
    wrap.appendChild(item);
  });
}

function renderSteps() {
  const box = document.getElementById("steps");
  if (!box) return;
  const steps = Array.isArray(settings.howItWorksSteps) ? settings.howItWorksSteps : [];
  box.innerHTML = "";
  steps.forEach((st, i) => {
    const card = h("div", "step-card");
    card.appendChild(h("span", "step-num", String(i + 1).padStart(2, "0")));
    card.appendChild(h("h3", "step-title", pick(st.title, lang)));
    card.appendChild(h("p", "step-text", pick(st.text, lang)));
    box.appendChild(card);
  });
}

function applySettings(s) {
  settings = s;

  setText("site-logo", s.storeName);
  setText("site-logo-footer", s.storeName);
  setText("footer-logo-name", s.storeName);
  setText("site-tagline", s.tagline);

  setText("announcement-text", pick(s.announcement, lang));
  setText("hero-eyebrow", pick(s.eyebrow, lang));
  setText("hero-subtext", pick(s.heroSubtext, lang));
  setText("cta-primary", pick(s.ctaPrimary, lang));
  setText("cta-secondary-text", pick(s.ctaSecondary, lang));
  setText("how-title", pick(s.howItWorksTitle, lang));
  setText("products-title", pick(s.productsSectionTitle, lang));
  setText("testimonials-title", pick(s.testimonialsTitle, lang));
  setText("faq-title", pick(s.faqTitle, lang));
  setText("contact-title", pick(s.contactTitle, lang));
  setText("contact-text", pick(s.contactText, lang));
  setText("contact-wa-text", pick(s.contactCta, lang));
  setText("contact-ig-text", s.contactIgLabel || "Instagram");
  setText("footer-note", pick(s.footerNote, lang));
  setText("hours", pick(s.hours, lang));
  setText("phone-display", s.phoneDisplay);

  // hero headline supports one phrase per line
  const headline = document.getElementById("hero-headline");
  if (headline) {
    headline.innerHTML = pick(s.headline, lang)
      .split("\n").map((l) => l.trim()).filter(Boolean).join("<br>");
  }

  // order page
  setText("order-note", pick(s.orderNote, lang));
  setText("order-delivery-note", pick(s.orderDeliveryNote, lang));
  setText("success-title", pick(s.successTitle, lang));
  setText("success-text", pick(s.successText, lang));
  const deliveryText = document.getElementById("delivery-note-text");
  if (deliveryText) {
    const time = pick(s.deliveryTime, lang);
    deliveryText.textContent = pick(s.orderDeliveryNote, lang) + (time ? " · " + time : "");
  }

  // WhatsApp links (buttons + floating icon)
  if (s.whatsappNumber) {
    const text = encodeURIComponent(t("waDefaultText"));
    document.querySelectorAll("[data-whatsapp]").forEach((a) => {
      a.href = "https://wa.me/" + s.whatsappNumber + "?text=" + text;
    });
  }
  setText("footer-wa", s.phoneDisplay || "WhatsApp");

  // Instagram links
  if (s.instagram) {
    document.querySelectorAll("[data-instagram]").forEach((a) => {
      a.href = s.instagram;
    });
  }

  renderTrustBadges();
  renderSteps();
}

/* ---------- products (homepage) ---------- */

const productGrid = document.getElementById("product-grid");
let PRODUCTS = [];
let activeCat = "all";

function renderFilters() {
  const box = document.getElementById("filters");
  if (!box) return;
  const cats = [...new Set(PRODUCTS.map((p) => p.category).filter(Boolean))];
  box.innerHTML = "";

  const mk = (label, key) => {
    const b = h("button", "filter-chip" + (activeCat === key ? " is-active" : ""), label);
    b.type = "button";
    b.dataset.cat = key;
    b.addEventListener("click", () => {
      activeCat = key;
      renderFilters();
      renderProducts();
    });
    return b;
  };

  box.appendChild(mk(t("filterAll"), "all"));
  cats.forEach((c) => box.appendChild(mk(c, c)));
}

function renderProducts() {
  if (!productGrid) return;
  const list = activeCat === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCat);
  productGrid.innerHTML = "";
  if (!list.length) {
    productGrid.appendChild(h("p", "grid-message", t("emptyCat")));
    return;
  }
  list.forEach((p) => productGrid.appendChild(renderCard(p)));
}

function renderCard(p) {
  const article = h("article", "card");

  const imgWrap = h("div", "card-img");
  if (p.badge) imgWrap.appendChild(h("span", "badge", p.badge));
  const img = document.createElement("img");
  img.src = p.image ? encodeURI(p.image) : "";
  img.alt = p.name;
  img.loading = "lazy";
  imgWrap.appendChild(img);
  if (p.stock === false) imgWrap.appendChild(h("div", "out-of-stock", t("soldOut")));

  const body = h("div", "card-body");
  if (p.category) body.appendChild(h("span", "card-cat", p.category));
  body.appendChild(h("h3", null, p.name));
  if (p.spec) body.appendChild(h("p", "spec", p.spec));

  const priceRow = h("div", "price-row");
  priceRow.appendChild(h("span", "price", p.price + " DH"));
  if (p.oldPrice && p.oldPrice > p.price) {
    priceRow.appendChild(h("span", "price-old", p.oldPrice + " DH"));
  }
  body.appendChild(priceRow);

  const stock = h("div", "stock-row");
  const dot = document.createElement("span");
  dot.className = "dot";
  if (p.stock === false) {
    stock.classList.add("is-out");
    dot.classList.add("is-out");
    stock.appendChild(dot);
    stock.appendChild(document.createTextNode(t("soldOut")));
  } else {
    stock.appendChild(dot);
    stock.appendChild(document.createTextNode(t("inStock")));
  }
  body.appendChild(stock);

  if (settings && settings.freeDeliveryNote) {
    body.appendChild(h("p", "card-delivery", "🚚 " + pick(settings.freeDeliveryNote, lang)));
  }

  const btn = h("a", "btn", t("commandButton"));
  if (p.stock === false) {
    btn.classList.add("is-disabled");
    btn.setAttribute("aria-disabled", "true");
  } else {
    btn.href =
      "order.html?product=" + encodeURIComponent(p.name) +
      "&price=" + encodeURIComponent(p.price);
  }
  body.appendChild(btn);

  article.append(imgWrap, body);
  return article;
}

/* ---------- FAQ & testimonials ---------- */

async function loadFaq() {
  const box = document.getElementById("faq-list");
  if (!box) return;
  try {
    const data = await freshFetch("faq.json");
    (data.items || []).forEach((item) => {
      const details = document.createElement("details");
      details.className = "faq-item";
      const summary = document.createElement("summary");
      summary.textContent = item.q;
      const body = h("div", "faq-a", item.a);
      details.append(summary, body);
      box.appendChild(details);
    });
  } catch (e) {
    console.warn("FAQ did not load:", e);
  }
}

async function loadTestimonials() {
  const grid = document.getElementById("testimonials-grid");
  if (!grid) return;
  try {
    const data = await freshFetch("testimonials.json");
    (data.items || []).forEach((item) => {
      const card = h("div", "testimonial");
      const rating = Math.max(0, Math.min(5, item.rating || 0));
      card.appendChild(h("div", "stars", "★".repeat(rating) + "☆".repeat(5 - rating)));
      card.appendChild(h("p", "testimonial-text", item.text));
      const author = h("div", "testimonial-author");
      const initial = h("div", "testimonial-avatar", (item.name || "?").trim().charAt(0).toUpperCase());
      const who = h("div");
      who.appendChild(h("strong", null, item.name || ""));
      who.appendChild(h("span", null, item.city ? " — " + item.city : ""));
      author.append(initial, who);
      card.appendChild(author);
      grid.appendChild(card);
    });
  } catch (e) {
    console.warn("Testimonials did not load:", e);
  }
}

/* ---------- order page ---------- */

function initOrderPage() {
  const params = new URLSearchParams(window.location.search);
  const productName = params.get("product") || "Produit";
  const priceRaw = parseInt(params.get("price"), 10);
  const unitPrice = Number.isFinite(priceRaw) ? priceRaw : null;

  setText("product-name", productName);
  setText("product-price", unitPrice !== null ? unitPrice + " DH" : "—");

  const hiddenName = document.getElementById("hidden-product");
  const hiddenPrice = document.getElementById("hidden-price");
  if (hiddenName) hiddenName.value = productName;
  if (hiddenPrice) hiddenPrice.value = unitPrice !== null ? String(unitPrice) : "";

  const qtyInput = document.getElementById("qty");
  const qtyDisplay = document.getElementById("qty-display");
  const totalEl = document.getElementById("order-total");
  const hiddenTotal = document.getElementById("hidden-total");

  const updateTotal = () => {
    const qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
    if (qtyInput) qtyInput.value = String(qty);
    if (qtyDisplay) qtyDisplay.textContent = String(qty);
    if (totalEl) totalEl.textContent = unitPrice !== null ? unitPrice * qty + " DH" : "—";
    if (hiddenTotal) hiddenTotal.value = unitPrice !== null ? String(unitPrice * qty) : "";
  };

  if (qtyInput) qtyInput.addEventListener("input", updateTotal);
  updateTotal();

  const form = document.getElementById("order-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = t("submitting");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (response.ok) {
        form.style.display = "none";
        const success = document.getElementById("success-message");
        success.hidden = false;
        success.style.display = "block";
      } else {
        alert(t("fail") || "Une erreur est survenue. Réessayez ou contactez-nous sur WhatsApp.");
        submitBtn.disabled = false;
        submitBtn.textContent = t("submitOrder");
      }
    } catch (err) {
      alert(t("fail") || "Erreur réseau. Vérifiez votre connexion et réessayez.");
      submitBtn.disabled = false;
      submitBtn.textContent = t("submitOrder");
    }
  });
}

/* ---------- boot ---------- */

async function boot() {
  applyI18n();

  const toggle = document.getElementById("lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      lang = lang === "fr" ? "ar" : "fr";
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
      applyI18n();
      if (settings) applySettings(settings);
      if (productGrid) { renderFilters(); renderProducts(); }
    });
  }

  try {
    applySettings(await freshFetch("site-settings.json"));
  } catch (e) {
    console.warn("Site settings did not load, showing fallback text:", e);
  }

  if (productGrid) {
    try {
      PRODUCTS = (await freshFetch("products.json")).products || [];
      renderFilters();
      renderProducts();
    } catch (e) {
      productGrid.innerHTML = "";
      productGrid.appendChild(h("p", "grid-message", t("loadError")));
      console.error("Product load failed:", e);
    }
  }

  loadFaq();
  loadTestimonials();

  if (document.getElementById("order-form")) initOrderPage();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", boot);
