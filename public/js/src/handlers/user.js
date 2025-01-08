// handlers/user.js
import { elements } from "../utils/elements";
import { updateSettings, saveUser, deleteUser, loadUsers } from "../api/user";
import { updatePaginationInfo } from "../utils/pagination";
import { showAlert } from "../utils/alert";

let currentPage = 1;
let totalPages = 1;
let currentSort = "name";
let currentFilter = "";
let currentSearch = "";
const USERS_PER_PAGE = 10;
let currentUserId = null;

const renderUsersTable = users => {
  const userTableBody = document.getElementById("userTableBody");
  if (!userTableBody) return;

  userTableBody.innerHTML = users.length
    ? users
        .map(
          user => `
     <tr ${!user.active ? 'class="user--inactive"' : ""}>
       <td><img src="/img/users/${user.photo}" alt="${user.name}"></td>
       <td>${user.name}</td>
       <td>${user.email}</td>
       <td>${user.role}</td>
       <td>${
         user._id === currentUserId
           ? "<span>Your Account</span>"
           : `<div class="action-buttons">
           <button class="btn btn--small btn--edit" data-id="${user._id}" data-active="${user.active}">Edit</button>
           <button class="btn btn--small btn--delete" data-id="${user._id}">Delete</button>
         </div>`
       }</td>
     </tr>
   `,
        )
        .join("")
    : '<tr><td colspan="5" style="text-align: center;">No users found.</td></tr>';
};

const loadUsersTable = async () => {
  try {
    const data = await loadUsers(
      currentPage,
      USERS_PER_PAGE,
      currentSort,
      currentFilter,
      currentSearch,
    );
    const users = data.data;
    totalPages = data.pagination.totalPages;
    renderUsersTable(users);
    updatePaginationInfo(currentPage, totalPages);
  } catch (err) {
    console.error("Failed to load users:", err);
    showAlert("error", "Failed to load users");
  }
};

const handleUserFormSubmit = async e => {
  e.preventDefault();
  const isEdit = e.target.dataset.editing === "true";
  const userData = {
    name: document.getElementById("userName").value,
    role: document.getElementById("userRole").value,
    active: document.getElementById("userActive")?.value || "true",
  };

  if (!isEdit) {
    userData.email = document.getElementById("userEmail").value;
    userData.password = document.getElementById("userPassword").value;
    userData.passwordConfirm = document.getElementById(
      "userPasswordConfirm",
    ).value;
  }

  if (isEdit) userData.id = e.target.dataset.userId;

  try {
    await saveUser(userData, isEdit);
    loadUsersTable();
    document.getElementById("userModal").classList.remove("active");
  } catch (err) {
    console.error("Failed to save user:", err);
    showAlert("error", err.response?.data?.message || "Error saving user");
  }
};

const handleUserTableActions = async e => {
  const editBtn = e.target.closest(".btn--edit");
  const deleteBtn = e.target.closest(".btn--delete");

  if (editBtn) {
    const userId = editBtn.dataset.id;
    // TODO: Implement edit user functionality
  }

  if (deleteBtn) {
    const userId = deleteBtn.dataset.id;
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(userId);
        loadUsersTable();
      } catch (err) {
        showAlert(
          "error",
          err.response?.data?.message || "Error deleting user",
        );
      }
    }
  }
};

const initializePagination = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  prevPageBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsersTable();
    }
  });

  nextPageBtn?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadUsersTable();
    }
  });
};

const initializeUserManagement = container => {
  currentUserId = container.dataset.currentUserId;

  const searchInput = document.getElementById("searchUser");
  const roleFilter = document.getElementById("roleFilter");
  const userForm = document.getElementById("userForm");
  const userTableBody = document.getElementById("userTableBody");

  searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadUsersTable();
    }, 300),
  );

  roleFilter?.addEventListener("change", e => {
    currentFilter = e.target.value;
    currentPage = 1;
    loadUsersTable();
  });

  userForm?.addEventListener("submit", handleUserFormSubmit);
  userTableBody?.addEventListener("click", handleUserTableActions);

  initializePagination();
  loadUsersTable();
};

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export const initUserHandlers = () => {
  const { updateForm, passwordForm } = elements.user;
  const container = document.querySelector(".user-view__users-container");

  if (container) {
    // Only initialize user management if not already initialized
    if (!window.userManagementInitialized) {
      initializeUserManagement(container);
      window.userManagementInitialized = true;
    }
  }

  // Keep the existing password and update form handlers
  updateForm()?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = new FormData();
    form.append("name", document.getElementById("name").value);
    form.append("email", document.getElementById("email").value);
    form.append("photo", document.getElementById("photo").files[0]);
    await updateSettings(form, "data");
  });

  passwordForm()?.addEventListener("submit", async e => {
    e.preventDefault();
    await updateSettings(
      {
        currentPassword: document.getElementById("password-current").value,
        password: document.getElementById("password").value,
        passwordConfirm: document.getElementById("password-confirm").value,
      },
      "password",
    );
  });
};
