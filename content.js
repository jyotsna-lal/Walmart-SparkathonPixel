// ========== CONFIGURATION ==========

const OPENAI_API_KEY = "AIzaSyBaEZFelSC6g1jKTd6do-h0kpzVY1aB070"; // <-- Your GPT key

// ========== LISTENER for CHATBOT TITLE REQUEST ==========

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_PRODUCT_INFO") {
    const title =
      document.querySelector("h1")?.textContent?.trim() ||
      document.querySelector("[data-automation-id='product-title']")?.textContent?.trim() ||
      document.querySelector("div[itemprop='name']")?.textContent?.trim();

    if (title) {
      sendResponse({ title });
    } else {
      alert("Could not find product info!");
    }
  }
});

// ========== GPT CALL ==========

async function fetchEcoFact(productName) {
  const prompt = `Give me a fun, short sustainability fact related to renting or eco-friendly shopping for a product like "${productName}".`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "Renting helps reduce waste and carbon footprint!";
}

// ========== PRODUCT SCRAPER ==========

function scrapeProductInfo() {
  const titleElement =
    document.querySelector("h1") ||
    document.querySelector("[data-automation-id='product-title']") ||
    document.querySelector("div[itemprop='name']");

  const name = titleElement?.textContent?.trim() || "";

  let price = "";
  const priceSelectors = [
    '[data-automation-id="product-price"]',
    '.price-characteristic',
    '.prod-PriceHero .price-group',
    '[itemprop="price"]',
    '.w_iUH7',
  ];

  for (const sel of priceSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      price = el.innerText || el.textContent || el.content || "";
      break;
    }
  }

  if (!price) {
    const match = document.body.innerText.match(/\$\d+(\.\d{2})?/);
    if (match) price = match[0];
  }

  price = price.replace(/[^\d.]/g, "");
  return { name, price: parseFloat(price) };
}

// ========== MODAL HANDLER ==========

function showRentalModal(productName, originalPrice, rentalPrice, ecoFact) {
  const oldModal = document.getElementById('rent-a-basket-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'rent-a-basket-modal';
  modal.innerHTML = `
    <div style="
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      padding: 32px 28px 24px 28px;
      max-width: 350px;
      position: fixed;
      top: 80px;
      right: 40px;
      z-index: 10001;
      font-family: Arial, sans-serif;
      color: #222;
      border: 2px solid #2e7d32;
    ">
      <div style="font-size: 22px; font-weight: bold; margin-bottom: 10px;">Rent Instead (Eco)</div>
      <div style="margin-bottom: 8px;"><b>Product:</b> ${productName}</div>
      <div style="margin-bottom: 8px;"><b>Original Price:</b> $${originalPrice.toFixed(2)}</div>
      <div style="margin-bottom: 8px;"><b>Rental Price:</b> <span style="color:#2e7d32;font-weight:bold;">$${rentalPrice.toFixed(2)}</span></div>
      <div style="margin-bottom: 14px; font-size: 15px; color: #388e3c;">🌱 ${ecoFact}</div>
      <button id="close-rent-modal" style="
        background: #2e7d32; color: #fff; border: none; border-radius: 6px; padding: 8px 18px; font-size: 15px; cursor: pointer; margin-top: 8px;
      ">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-rent-modal').onclick = () => modal.remove();
}

// ========== RENT LOGIC (WITH DELAY) ==========

function handleRentButtonClick() {
  setTimeout(async () => {
    const { name, price } = scrapeProductInfo();
    if (!name || !price) {
      alert("Could not find product info!");
      return;
    }
    const rentalPrice = price * 0.6;
    showRentalModal(name, price, rentalPrice, "Loading sustainability fact...");
    const ecoFact = await fetchEcoFact(name);
    showRentalModal(name, price, rentalPrice, ecoFact);
  }, 500); // Delay to ensure product is visible in DOM
}

// ========== INJECT RENT BUTTON ==========

function injectRentButton() {
  if (document.getElementById('rent-a-basket-btn')) return;

  const button = document.createElement('button');
  button.innerText = 'Rent Instead (Eco)';
  button.id = 'rent-a-basket-btn';
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '120px',
    right: '40px',
    zIndex: 10000,
    background: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '18px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    transition: 'background 0.2s'
  });
  button.onmouseover = () => button.style.background = '#388e3c';
  button.onmouseout = () => button.style.background = '#2e7d32';
  button.onclick = handleRentButtonClick;

  document.body.appendChild(button);
}

// ========== INJECT WALL-E CHATBOT IFRAME ==========

function injectReactChatbot() {
  if (document.getElementById('wall-e-chatbot-iframe')) return;

  const iframe = document.createElement('iframe');
  iframe.id = 'wall-e-chatbot-iframe';
  iframe.src = chrome.runtime.getURL('chatbot.html');
  Object.assign(iframe.style, {
    position: 'fixed',
    bottom: '25px',
    right: '30px',
    width: '400px',
    height: '530px',
    border: 'none',
    borderRadius: '12px',
    zIndex: 9999,
    boxShadow: '0 0 12px rgba(0,0,0,0.2)'
  });
  document.body.appendChild(iframe);
}

// ========== RUN ON PRODUCT PAGE ==========

function onProductPage() {
  return /\/ip\//.test(location.pathname);
}

function runOnProductPage() {
  if (onProductPage()) {
    injectRentButton();
    injectReactChatbot();
  }
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(() => {
      runOnProductPage();
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });

runOnProductPage();
