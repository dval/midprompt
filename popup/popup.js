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

async function openMoveOptions(snippetId, currentCategory) {
  const categories = await getAllCategories();
  const currentCategoryId = currentCategory.id;

  // get modal dialog
  const modalBackground = document.getElementById("modal-background");
  const moveOptionsModal = document.getElementById("move-category-list");

  // Create the list of move options
  const moveOptions = document.createElement("ul");
  moveOptions.className = "move-options";

  // add the move options to the modal
  moveOptionsModal.innerHTML = '';
  moveOptionsModal.appendChild(moveOptions);

  categories.forEach((category) => {
    if (category.id !== currentCategoryId) {
      const moveOption = document.createElement("li");
      moveOption.textContent = category.name;
      moveOption.setAttribute("data-category-id", category.id);

      moveOption.addEventListener("click", async () => {
        // Call the function to move the snippet to the selected category
        await moveSnippet(snippetId, category.id);

        // Refresh the snippet list to reflect the changes
        populateSnippetList(currentCategory);

        // Remove the move options list
        //document.body.removeChild(moveOptions);
        modalBackground.style.display = "none";
      });

      moveOptions.appendChild(moveOption);
    }
  });

  modalBackground.style.display = "block";
  //document.body.appendChild(moveOptionsModal);

  // Add a click event listener to close the move options list if clicked outside
  modalBackground.addEventListener("click", (event) => {
    if (!event.target.closest(".move-options, .move-button")) {
      modalBackground.style.display = "none";
      // if (document.body.contains(moveOptionsModal)) {
      //   document.body.removeChild(moveOptionsModal);
      // }
    }
  });
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
      if (!event.target.closest('div.delete-button, div.edit-button, div.move-button')) {
        populateSnippetList(category);
      }
    });

    if (category.name !== 'Uncategorized') {

      // create a delete button for each category
      let categoryDelteButton = document.createElement('div');
      categoryDelteButton.className = 'delete-button material-symbols-outlined';
      categoryDelteButton.textContent = 'delete';
      categoryDelteButton.addEventListener('click', async () => {
        await deleteCategory(category.id);
        populateCategories();

        // Notify the background script to update the context menu items
        chrome.runtime.sendMessage({ action: 'updateCategoryContextMenu' });
      });
      listItem.appendChild(categoryDelteButton);

      // create edit button for each category
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
async function populateSnippetList(category) {
  const snippetList = document.getElementById('snippet-list');
  const snippetTitle = document.getElementById('snippet-container');
  const snippets = await getSnippetsByCategory(category.id);
  const spaceSnippets = document.getElementById('space-snippets');

  snippetList.innerHTML = '';
  //snippetList.appendChild(createBackButton());

  // Set the title of the snippet list
  if (snippetTitle) {
    snippetTitle.firstElementChild.innerHTML = category.name;
  }

  // Create a list item for each snippet and add it to the list
  snippets.forEach((snippet) => {

    // Build snippet element
    const listItem = document.createElement('div');
    listItem.setAttribute('value', snippet.text);
    const snippetText = document.createTextNode(snippet.text);
    // Build UI
    listItem.appendChild(snippetText);

    // Create the "delete" button
    let deleteButton = document.createElement('div');
    deleteButton.className = 'delete-button material-symbols-outlined';
    deleteButton.textContent = 'delete';
    deleteButton.addEventListener('click', async () => {
      await deleteSnippet(snippet.id);

      populateCategories();

      // Notify the background script to update the context menu items
      chrome.runtime.sendMessage({ action: 'updateCategoryContextMenu' });

      // Refresh the snippet list 
      populateSnippetList(category);
    });
    listItem.appendChild(deleteButton);

    // Create the "move" button
    const moveButton = document.createElement('div');
    moveButton.className = 'move-button material-symbols-outlined';
    moveButton.textContent = 'upgrade';
    moveButton.addEventListener('click', async (event) => {
      openMoveOptions(snippet.id, category);

      populateCategories();

      // Notify the background script to update the context menu items
      chrome.runtime.sendMessage({ action: 'updateCategoryContextMenu' });
    });
    listItem.appendChild(moveButton);

    // Add an event listener to the list item to copy the snippet text to the clipboard
    listItem.addEventListener('click', async (event) => {
      if (!event.target.closest('.delete-button, .edit-button, .move-button')) {
        const textToCopy = listItem.getAttribute('value');
        const currentString = document.getElementById('current-prompt');
        var content = document.createTextNode(textToCopy);

        if (event.ctrlKey) {
          if (spaceSnippets.checked) {
            currentString.append(' ');
          }
          // Read the current clipboard text
          currentString.append(content);
          // Write the updated text back to the clipboard
          await navigator.clipboard.writeText(currentString.innerHTML);
        } else {
          currentString.innerHTML = content.textContent;
          // Overwrite the current clipboard text with the new text
          await navigator.clipboard.writeText(currentString.innerHTML);
        }
      }
    });

    // Add the list item to the list
    snippetList.appendChild(listItem);
  });

  // Add click event listener to the "Add Snippet" button
  const addSnippetButton = document.getElementById('add-snippet');
  addSnippetButton.addEventListener('click', () => {
    openSnippetModal(category);
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
  const closeBtn = document.querySelector('.new-category-close');
  const submitBtn = document.querySelector('.new-category-submit');

  if (category) {
    input.value = category.name;
    form.setAttribute('data-id', category.id);
  } else {
    input.value = '';
    form.removeAttribute('data-id');
  }

  modal.style.display = 'block';

  closeBtn.onclick = () => {
    input.value = '';
    modal.style.display = 'none';
  };

  submitBtn.onclick = () => {
    form.dispatchEvent(new Event('submit'));
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

// open the modal dialog to move a snippet to a different category
function openSnippetModal(category) {
  const modal = document.getElementById('snippet-modal');
  const form = document.getElementById('snippet-form');
  const input = document.getElementById('snippet-text');
  const closeBtn = document.querySelector('.new-snippet-close');
  const submitBtn = document.querySelector('.new-snippet-submit');
  const addSnippetButton = document.getElementById('add-snippet');
  const categoryId = category.id;

  modal.style.display = 'block';
  addSnippetButton.style.display = 'none';

  closeBtn.onclick = () => {
    modal.style.display = 'none';
    addSnippetButton.style.display = 'block';
  };

  submitBtn.onclick = () => {
    form.dispatchEvent(new Event('submit'));
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    const snippetText = input.value;

    if (snippetText !== null) {
      await addSnippet(snippetText, categoryId);
    }

    await populateSnippetList(category);
    modal.style.display = 'none';
    addSnippetButton.style.display = 'block';
  };
}

window.addEventListener('click',function(e){
  e.preventDefault();
  if(e.target.href!==undefined){
    chrome.tabs.create({url:e.target.href})
  }
})