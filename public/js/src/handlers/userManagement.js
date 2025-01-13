// handlers/userManagement.js
import { elements } from "../utils/elements";
import { showAlert } from "../utils/alert";
import { saveUser, deleteUser, loadUsers } from "../api/userManagement";
import { toggleModal, toggleFormFields } from "../utils/dom";
import { updatePaginationInfo } from "../utils/pagination";

let currentPage = 1;
let totalPages = 1;
let searchTerm = "";
let roleFilter = "";
const LIMIT = 10;

const renderUserRow = (user, currentUserId) => {
  const isCurrentUser = user._id === currentUserId;
  const inactiveClass = !user.active ? "user--inactive" : "";
  return `
    <tr class="${inactiveClass}">
      <td>
        <img src="/img/users/${user.photo}" alt="User photo" class="user-photo">
      </td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>
        ${
          isCurrentUser
            ? "<span>Your account</span>"
            : `
            <button class="btn btn--small btn--edit" data-id="${user._id}" data-active="${user.active}">
              Edit
            </button>
            <button class="btn btn--small btn--red btn--delete" data-id="${user._id}">
              Delete
            </button>
          `
        }
      </td>
    </tr>
  `;
};

const handleUserLoad = async () => {
  try {
    const container = elements.user.usersContainer();
    if (!container) return;

    const currentUserId = container.dataset.currentUserId;
    const response = await loadUsers(
      currentPage,
      LIMIT,
      "name",
      roleFilter,
      searchTerm,
    );

    const tableBody = document.getElementById("userTableBody");
    if (tableBody) {
      tableBody.innerHTML = response.data.data
        .map(user => renderUserRow(user, currentUserId))
        .join("");
    }

    totalPages = response.data.pagination.totalPages;
    updatePaginationInfo(currentPage, totalPages);
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error loading users");
  }
};

const handleSearch = e => {
  searchTerm = e.target.value;
  currentPage = 1;
  handleUserLoad();
};

const handleRoleFilter = e => {
  roleFilter = e.target.value;
  currentPage = 1;
  handleUserLoad();
};

const handleUserDelete = async userId => {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    await deleteUser(userId);
    showAlert("success", "User deleted successfully!");
    handleUserLoad();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error deleting user");
  }
};

const handleUserSubmit = async e => {
  e.preventDefault();
  const form = e.target;
  const isEdit = form.dataset.editing === "true";

  try {
    const formData = {
      name: document.getElementById("userName").value,
      role: document.getElementById("userRole").value,
    };

    if (isEdit) {
      formData.id = form.dataset.userId;
      formData.active = document.getElementById("userActive").value;
    } else {
      formData.email = document.getElementById("userEmail").value;
      formData.password = document.getElementById("userPassword").value;
      formData.passwordConfirm = document.getElementById(
        "userPasswordConfirm",
      ).value;
    }

    await saveUser(formData, isEdit);
    showAlert(
      "success",
      `User ${isEdit ? "updated" : "created"} successfully!`,
    );
    toggleModal("userModal", false);
    handleUserLoad();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving user");
  }
};

const initializeEventListeners = () => {
  const container = elements.user.usersContainer();
  if (!container) return;

  // Initialize event listeners
  const searchInput = document.getElementById("searchUser");
  const roleFilter = document.getElementById("roleFilter");
  const createUserBtn = document.getElementById("createUserBtn");
  const userForm = document.getElementById("userForm");
  const closeModalBtn = document.querySelector(".close-modal");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", handleRoleFilter);
  }

  if (createUserBtn) {
    createUserBtn.addEventListener("click", () => {
      const form = document.getElementById("userForm");
      if (form) {
        form.reset();
        form.dataset.editing = "false";
        delete form.dataset.userId;
        toggleFormFields(form, true);
        document.getElementById("modalTitle").textContent = "Create New User";
        toggleModal("userModal", true);
      }
    });
  }

  if (userForm) {
    userForm.addEventListener("submit", handleUserSubmit);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () =>
      toggleModal("userModal", false),
    );
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        handleUserLoad();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        handleUserLoad();
      }
    });
  }

  // Event delegation for edit and delete buttons
  container.addEventListener("click", e => {
    const editBtn = e.target.closest(".btn--edit");
    const deleteBtn = e.target.closest(".btn--delete");

    if (editBtn) {
      const userId = editBtn.dataset.id;
      const row = editBtn.closest("tr");
      const name = row.cells[1].textContent;
      const role = row.cells[3].textContent;
      const active = editBtn.dataset.active;

      const form = document.getElementById("userForm");
      if (form) {
        form.dataset.editing = "true";
        form.dataset.userId = userId;
        document.getElementById("userName").value = name;
        document.getElementById("userRole").value = role;
        document.getElementById("userActive").value = active;
        toggleFormFields(form, false);
        document.getElementById("modalTitle").textContent = "Edit User";
        toggleModal("userModal", true);
      }
    }

    if (deleteBtn) {
      const userId = deleteBtn.dataset.id;
      handleUserDelete(userId);
    }
  });

  // Initial load
  handleUserLoad();
};

export const initializeUserManagement = () => {
  const container = elements.user.usersContainer();
  if (!container) return;

  initializeEventListeners();
  handleUserLoad();
};
