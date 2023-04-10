/**
 * common.js - Common functions used by both the popup and background scripts.
 *
 * @author Dylan Valentine
 * @version 1.0.0
 */

// IndexedDB configuration and functions
const DB_NAME = 'discordSnippetDB';
const DB_VERSION = 1;
const SNIPPET_STORE_NAME = 'snippets';
const CATEGORY_STORE_NAME = 'categories';

// Function to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(SNIPPET_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      db.createObjectStore(CATEGORY_STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

// Function to add a snippet to IndexedDB
async function addSnippet(snippet, categoryId) {
  const db = await openIndexedDB();
  const transaction = db.transaction(SNIPPET_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SNIPPET_STORE_NAME);
  store.add({ text: snippet, categoryId: categoryId });
}

// Function to get all snippets from IndexedDB
async function getAllSnippets() {
  const db = await openIndexedDB();
  const transaction = db.transaction(SNIPPET_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SNIPPET_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

// Function to delete a snippet from IndexedDB
async function deleteSnippet(id) {
  const db = await openIndexedDB();
  const transaction = db.transaction(SNIPPET_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SNIPPET_STORE_NAME);
  store.delete(id);
}

// Function to get all snippets for a specific category from IndexedDB
async function getSnippetsByCategory(categoryId) {
  const db = await openIndexedDB();
  const transaction = db.transaction(SNIPPET_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SNIPPET_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => {
      const allSnippets = event.target.result;
      const filteredSnippets = allSnippets.filter(snippet => snippet.categoryId === categoryId);
      resolve(filteredSnippets);
    };
  });
}

async function addCategory(categoryName) {
  const db = await openIndexedDB();
  const transaction = db.transaction(CATEGORY_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(CATEGORY_STORE_NAME);
  store.add({ name: categoryName });
}

// Function to get all categories from IndexedDB
async function getAllCategories() {
  const db = await openIndexedDB();
  const transaction = db.transaction(CATEGORY_STORE_NAME, 'readonly');
  const store = transaction.objectStore(CATEGORY_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

// Function to edit a category in IndexedDB
async function editCategory(id, newCategoryName) {
  console.log(id, newCategoryName);
  const db = await openIndexedDB();
  const transaction = db.transaction(CATEGORY_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(CATEGORY_STORE_NAME);
  // Ensure the id is a number
  const numericId = parseInt(id, 10);
  const request = store.get(numericId);
  request.onerror = (event) => console.error(event.target.error);
  request.onsuccess = (event) => {
    console.log(event.target);
    const category = event.target.result;
    category.name = newCategoryName;
    store.put(category);
  };
}

// Function to delete a snippet from IndexedDB
async function deleteCategory(id) {
  const db = await openIndexedDB();

  // Get the 'Uncategorized' category ID
  const uncategorizedCategory = await getUncategorizedCategoryId();

  // Get all snippets
  const allSnippets = await getAllSnippets();

  // Filter snippets by the category to delete
  const snippetsToDelete = allSnippets.filter(snippet => snippet.categoryId === id);

  const transaction = db.transaction([SNIPPET_STORE_NAME, CATEGORY_STORE_NAME], 'readwrite');
  const snippetStore = transaction.objectStore(SNIPPET_STORE_NAME);
  const categoryStore = transaction.objectStore(CATEGORY_STORE_NAME);


  // Update snippets to reassign to the 'Uncategorized' category
  if (snippetsToDelete.length > 0) {
    const snippetRequest = snippetStore.openCursor();
    snippetRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.categoryId === id) {
          const updatedSnippet = cursor.value;
          updatedSnippet.categoryId = uncategorizedCategory;
          snippetStore.put(updatedSnippet);
          cursor.continue();
        }
      } 
        // All snippets have been updated; delete the category
        categoryStore.delete(id);
    };
  } else {
    // No snippets to update; delete the category
    categoryStore.delete(id);
  }

  transaction.onerror = (event) => {
    console.error(event.target.error);
  };
  
}

// Function to get the 'Uncategorized' category ID
async function getUncategorizedCategoryId() {
  return new Promise(async (resolve, reject) => {
    const db = await openIndexedDB();
    const transaction = db.transaction(CATEGORY_STORE_NAME, 'readonly');
    const store = transaction.objectStore(CATEGORY_STORE_NAME);
    const request = store.openCursor();
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.name === 'Uncategorized') {
          resolve(cursor.value.id);
        }
        cursor.continue();
      } else {
        reject(new Error("Uncategorized category not found"));
      }
    };
  });
}

// Function to initialize categories when the extension is first installed
async function initializeCategories() {
  const categories = await getAllCategories();
  const uncategorizedExists = categories.some((category) => category.name === 'Uncategorized');
  if (!uncategorizedExists) {
    await addCategory('Uncategorized');
  }
}

