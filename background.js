/**
 * background.js handles the background logic and communication between the popup and content script.
 *
 * @author Dylan Valentine
 * @version 1.0.0
 */

importScripts('scripts/common.js');


function clearContextMenuItems() {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      console.log("Cleared all existing category context menu items");
      resolve();
    });
  });
}


async function updateCategoryContextMenu() {
  // Clear all existing category context menu items under 'save-selected-text' parentId
  await clearContextMenuItems();

  // Clear all existing category context menu items under 'save-selected-text' parentId
  // chrome.contextMenus.removeAll(() => {
  //   console.log("Cleared all existing category context menu items");
  // });
  

  // Recreate the parent context menu item
  chrome.contextMenus.create({
    id: 'save-selected-text',
    title: 'Save selected text',
    contexts: ['selection'],
  });

  // Get the updated list of categories
  const categories = await getAllCategories();

  // Create new context menu items for each category
  categories.forEach((category) => {
    chrome.contextMenus.create({
      id: `category-${category.id}`,
      title: category.name,
      parentId: 'save-selected-text',
      contexts: ['selection'],
    });
    if (chrome.runtime.lastError) {
      // Ignore the error if the menu item is not found
      console.warn(`Menu item not found: save-selected-text`);
    }
  });
}


// initialize setup when the extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  await initializeCategories(); // Ensure the default category "Uncategorized" exists

  chrome.contextMenus.create({
    id: 'save-selected-text',
    title: 'Save selected text',
    contexts: ['selection'],
  });

  await updateCategoryContextMenu();
});

// Handle context menu item clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.parentMenuItemId === 'save-selected-text') {
    const selectedText = info.selectionText;
    const categoryId = parseInt(info.menuItemId.split('-')[1]);
    await addSnippet(selectedText, categoryId);
  }
});

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // update the context menu items
  if (request.action === 'updateCategoryContextMenu') {
    updateCategoryContextMenu();
  }
});
