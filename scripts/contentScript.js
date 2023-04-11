/**
 * contentScript.js is injected into the page when the extension is enabled.
 *
 * @author Dylan Valentine
 * @version 1.0.0
 */

// This function does not work due to security something or other.
// function pasteTextIntoDiscord(text) {
//   const chatInput = document.querySelector('div[data-slate-editor="true"][contenteditable="true"]');
//   if (chatInput) {
//     const pasteEvent = new ClipboardEvent('paste', {
//       dataType: 'text/plain',
//       data: text
//     });
//     chatInput.dispatchEvent(pasteEvent);
//   }
// }

// Get clipboard contents
function readClipboard() {
  navigator.clipboard.readText()
  .then((text) => {
    console.log("pasteText: " + text);
    // auto-paste the text into the Discord chat input
    // pasteTextIntoDiscord(text);
    window.removeEventListener('focus', readClipboard);
  })
  .catch((err) => {
    console.error('Failed to read clipboard contents: ', err.message);
  });
}

// listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pasteText') {
    // focus the window so we can read clipboard contents
    window.focus(); 
    if (document.hasFocus()) {
      readClipboard();
      window.removeEventListener('focus', readClipboard);
    } else {
      window.addEventListener('focus', readClipboard);
    }
  }
});
