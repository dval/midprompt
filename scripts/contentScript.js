/**
 * contentScript.js is injected into the page when the extension is enabled.
 *
 * @author Dylan Valentine
 * @version 1.0.0
 */

// listen for messages from the popup
// TODO: remove attempt to write into discord DOM
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === 'pasteText') {
//     // focus the window so we can read clipboard contents
//     window.focus(); 
//     if (document.hasFocus()) {
//       readClipboard();
//       window.removeEventListener('focus', readClipboard);
//     } else {
//       window.addEventListener('focus', readClipboard);
//     }
//   }
// });
