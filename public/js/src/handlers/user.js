// handlers/user.js
import { elements } from "../utils/elements";
import { updateSettings, saveUser, deleteUser, loadUsers } from "../api/user";

let currentPage = 1;
let totalPages = 1;
let currentSort = "name";
let currentFilter = "";
let currentSearch = "";
const USERS_PER_PAGE = 10;

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
    const data = await loadUsers(
      currentPage,
      USERS_PER_PAGE,
      currentSort,
      currentFilter,
      currentSearch,
    );
    totalPages = data.pagination.totalPages;
    renderUsersTable(data.data);
    updatePaginationInfo();
  } catch (err) {
    console.error("Failed to load users:", err);
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
