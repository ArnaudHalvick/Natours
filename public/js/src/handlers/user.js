// handlers/user.js
import { elements } from "../utils/elements";
import { updateSettings, saveUser, deleteUser, loadUsers } from "../api/user";
import { updatePaginationInfo } from "../utils/pagination";

const userContainer = document.querySelector(".user-view__users-container");
const currentUserId = userContainer
  ? userContainer.dataset.currentUserId
  : null;

let currentPage = 1;
let totalPages = 1;
let currentSort = "name";
let currentFilter = "";
let currentSearch = "";
const USERS_PER_PAGE = 10;

const renderUsersTable = users => {
  console.log("Rendering users:", users); // Debug log

  const userTableBody = document.getElementById("userTableBody");
  console.log("User table body element:", userTableBody);

  userTableBody.innerHTML = "";

  if (users.length === 0) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center;">No users found.</td>
      </tr>
    `;
  } else {
    users.forEach(user => {
      const row = document.createElement("tr");
      if (!user.active) row.classList.add("user--inactive");

      const isCurrentUser = user._id === currentUserId;
      let actionButtons = `
        <div class="action-buttons">
          <button class="btn btn--small btn--edit" data-id="${user._id}" data-active="${user.active}">Edit</button>
          <button class="btn btn--small btn--delete" data-id="${user._id}">Delete</button>
        </div>
      `;

      if (isCurrentUser) actionButtons = `<span>Your Account</span>`;

      row.innerHTML = `
        <td><img src="/img/users/${user.photo}" alt="${user.name}"></td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${actionButtons}</td>
      `;
      userTableBody.appendChild(row);
    });
  }
};

export const initUserHandlers = () => {
  const { updateForm, passwordForm, usersContainer } = elements.user;

  if (updateForm()) {
    updateForm().addEventListener("submit", async e => {
      e.preventDefault();
      const form = new FormData();
      form.append("name", document.getElementById("name").value);
      form.append("email", document.getElementById("email").value);
      form.append("photo", document.getElementById("photo").files[0]);
      await updateSettings(form, "data");
    });
  }

  if (passwordForm()) {
    passwordForm().addEventListener("submit", async e => {
      e.preventDefault();
      const passwordData = {
        currentPassword: document.getElementById("password-current").value,
        password: document.getElementById("password").value,
        passwordConfirm: document.getElementById("password-confirm").value,
      };
      await updateSettings(passwordData, "password");
    });
  }

  if (usersContainer()) {
    initializeUserManagement();
    console.log("Initializing user management...");
  }
};

const initializeUserManagement = () => {
  const userForm = document.getElementById("userForm");
  const searchInput = document.getElementById("searchUser");
  const roleFilter = document.getElementById("roleFilter");
  const userTableBody = document.getElementById("userTableBody");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(e => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadUsersTable();
      }, 300),
    );
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", e => {
      currentFilter = e.target.value;
      currentPage = 1;
      loadUsersTable();
    });
  }

  if (userForm) {
    userForm.addEventListener("submit", handleUserFormSubmit);
  }

  if (userTableBody) {
    userTableBody.addEventListener("click", handleUserTableActions);
  }

  initializePagination();
  loadUsersTable();
};

const loadUsersTable = async () => {
  try {
    // Load users with current search, filter, and pagination applied
    const data = await loadUsers(
      currentPage,
      USERS_PER_PAGE,
      currentSort,
      currentFilter,
      currentSearch,
    );
    console.log(
      "DATA",
      currentPage,
      USERS_PER_PAGE,
      currentSort,
      currentFilter,
      currentSearch,
    );

    console.log("Loaded users:", data.data); // Debug log

    const users = data.data; // Extract users from response
    totalPages = data.pagination.totalPages; // Update total pages

    // Render the users table and update pagination
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
  }
};

const handleUserTableActions = async e => {
  const editBtn = e.target.closest(".btn--edit");
  const deleteBtn = e.target.closest(".btn--delete");

  if (editBtn) handleEditUser(editBtn);
  if (deleteBtn) handleDeleteUser(deleteBtn);
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
