// Rent-A-Basket popup logic

console.log('Rent-A-Basket popup loaded.');

// ✅ Add event listener to open chatbot.html in a new tab
document.addEventListener('DOMContentLoaded', () => {
  const openChatbotBtn = document.getElementById('open-chatbot');
  if (openChatbotBtn) {
    openChatbotBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('chatbot.html')
      });
    });
  }
});
