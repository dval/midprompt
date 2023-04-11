/**
 * popup.js handles the popup UI and logic.
 *
 * @author Dylan Valentine
 * @version 1.0.0
 */

// parse template and return the populated string
function template(strings, ...keys) {
  return (...values) => {
    const dict = values[values.length - 1] || {};
    const result = [strings[0]];
    keys.forEach((key, i) => {
      const value = Number.isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join("");
  };
}

// retrieve the category list from storage
async function populateCategories() {
  const categories = await getAllCategories();

  const categoryList = document.getElementById('category-list');
  categoryList.innerHTML = '';

  categories.forEach((category) => {
    const listItem = document.createElement('div');
    listItem.setAttribute('data-id', category.id);
    listItem.textContent = category.name;

    listItem.addEventListener('click', async (event) => {
      if (!event.target.closest('div.delete-button, div.edit-button')) {
        populateSnippetList(category.id);
      }
    });

    if (category.name !== 'Uncategorized') {
      let snippitDeleteButton = document.createElement('div');
      snippitDeleteButton.className = 'delete-button material-symbols-outlined';
      snippitDeleteButton.textContent = 'delete';
      snippitDeleteButton.addEventListener('click', async () => {
        await deleteCategory(category.id);
        populateCategories();

        // Notify the background script to update the context menu items
        chrome.runtime.sendMessage({ action: 'updateCategoryContextMenu' });
      });
      listItem.appendChild(snippitDeleteButton);
      
      const editButton = document.createElement('div');
      editButton.className = 'edit-button material-symbols-outlined';
      editButton.textContent = 'edit';
      editButton.addEventListener('click', () => {
        openCategoryModal(category);
      });
      listItem.appendChild(editButton);

    }

    categoryList.appendChild(listItem);
  });
}

// retrieve the snippets for a category
async function populateSnippetList(categoryId) {
  const snippetList = document.getElementById('snippet-list');
  const snippets = await getSnippetsByCategory(categoryId);

  snippetList.innerHTML = '';
  //snippetList.appendChild(createBackButton());

  // Create a list item for each snippet and add it to the list
  snippets.forEach((snippet) => {
    // Build snippet element
    const listItem = document.createElement('div');
    listItem.setAttribute('value', snippet.text);
    const snippetText = document.createTextNode(snippet.text);
    let deleteButton = document.createElement('div');
    deleteButton.className = 'delete-button material-symbols-outlined';
    deleteButton.textContent = 'delete';
    deleteButton.addEventListener('click', async () => {
      await deleteSnippet(snippet.id);
      
      populateCategories();

      // Notify the background script to update the context menu items
      chrome.runtime.sendMessage({ action: 'updateCategoryContextMenu' });

      // Refresh the snippet list if the deleted category is currently displayed
      const snippetContainer = document.getElementById('snippet-container');
      if (snippetList.style.display === 'block') {
        populateSnippetList(categoryId);
      }
    });


    // Build UI
    listItem.appendChild(snippetText);
    listItem.appendChild(deleteButton);

    // Add an event listener to the list item to copy the snippet text to the clipboard and close the window
    listItem.addEventListener('click', async (event) => {
      if (event.target !== deleteButton) {
        await navigator.clipboard.writeText(listItem.getAttribute('value')).then(
          // Send a message to contentScript.js to paste the text
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'pasteText' });
          })
        );
        window.close();
      }
    });

    // Add the list item to the list
    snippetList.appendChild(listItem);
  });
  showSnippetList(); // Show the snippet list after populating it
}

// display the category list
function showCategoryList() {
  const categoryList = document.getElementById('category-container');
  const snippetList = document.getElementById('snippet-container');
  categoryList.style.display = 'block';
  snippetList.style.display = 'none';
}

// display the snippet list for a category
function showSnippetList() {
  const categoryList = document.getElementById('category-container');
  const snippetList = document.getElementById('snippet-container');
  categoryList.style.display = 'none';
  snippetList.style.display = 'block';
}

function openCategoryModal(category) {
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const input = document.getElementById('category-name');
  const closeBtn = document.querySelector('.close');

  if (category) {
    input.value = category.name;
    form.setAttribute('data-id', category.id);
  } else {
    input.value = '';
    form.removeAttribute('data-id');
  }

  modal.style.display = 'block';

  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    const categoryName = input.value;
    const categoryId = form.getAttribute('data-id');

    if (categoryId && categoryName !== null) {
      await editCategory(categoryId, categoryName);
    } else {
      await addCategory(categoryName);
    }

    populateCategories();

    // Notify the background script to update the context menu items
    chrome.runtime.sendMessage({ action: 'updateCategoryContextMenu' });

    modal.style.display = 'none';
  };
}


// Initial population of categories
populateCategories();

// Initial display setup
showCategoryList();

// Add click event listener to the "Add Category" button
// opens the snippet list when a category is clicked
const addCategoryButton = document.getElementById('add-category');
addCategoryButton.addEventListener('click', () => {
  openCategoryModal(null);
});

// Add click event listener to the "Back" button
const backButton = document.getElementById('back-button');
backButton.addEventListener('click', () => {
  showCategoryList();
});
// Listen for the 'refreshSnippetList' message from background.js
// update categories and snippets when changes are made
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshSnippetList') {
    // Refresh both categories and snippets in case a new category was added
    populateCategories();
    populateSnippetList(null);
  }
});
