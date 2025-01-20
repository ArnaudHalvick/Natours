// handlers/userManagement.js
import { elements } from "../utils/elements";
import { showAlert } from "../utils/alert";
import {
  saveUser,
  deleteUser,
  loadUsers,
  resendConfirmation,
} from "../api/userManagementAPI";
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
      <td>
        ${user.email}
      </td>
      <td>${user.role}</td>
      <td>
        ${
          isCurrentUser
            ? "<span>Your account</span>"
            : `
              <button
                class="btn btn--small btn--green btn--edit"
                data-id="${user._id}"
                data-active="${user.active}"
              >
                Edit
              </button>
              <button
                class="btn btn--small btn--red btn--delete"
                data-id="${user._id}"
                data-name="${user.name}"
                data-email="${user.email}"
                data-photo="/img/users/${user.photo}"
              >
                Delete
              </button>
              ${
                user.emailConfirmed
                  ? `<button
                      class="btn btn--small btn--orange btn--confirmed disabled"
                      disabled
                    >
                      Email Confirmed
                    </button>`
                  : `<button
                      class="btn btn--small btn--orange btn--resend"
                      data-id="${user._id}"
                      data-email="${user.email}"
                    >
                      Resend Email
                    </button>`
              }
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

const handleUserDelete = userId => {
  const deleteModal = document.getElementById("deleteUserModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteUserBtn");

  const confirmHandler = async () => {
    try {
      await deleteUser(userId);
      showAlert("success", "User deleted successfully!");
      handleUserLoad();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Error deleting user");
    } finally {
      toggleModal("deleteUserModal", false);
      confirmDeleteBtn.removeEventListener("click", confirmHandler);
    }
  };

  confirmDeleteBtn.addEventListener("click", confirmHandler);
  toggleModal("deleteUserModal", true);
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

    const response = await saveUser(formData, isEdit);
    showAlert(
      "success",
      `User ${isEdit ? "updated" : "created"} successfully!`,
    );

    if (!isEdit) {
      showAlert("success", "Confirmation email sent to user.");
    }

    toggleModal("userModal", false);
    handleUserLoad();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving user");
  }
};

const handleResendConfirmation = async (userId, email) => {
  try {
    await resendConfirmation(email);
    showAlert("success", "Confirmation email resent successfully!");
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || "Error resending confirmation email",
    );
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
  const cancelUserBtn = document.getElementById("cancelUserBtn");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const closeDeleteModalBtn = document.querySelector(".close-delete-modal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteUserBtn");

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

  if (cancelUserBtn) {
    cancelUserBtn.addEventListener("click", () => {
      const form = document.getElementById("userForm");
      if (form) form.reset();
      toggleModal("userModal", false);
    });
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

  if (closeDeleteModalBtn) {
    closeDeleteModalBtn.addEventListener("click", () =>
      toggleModal("deleteUserModal", false),
    );
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () =>
      toggleModal("deleteUserModal", false),
    );
  }

  // Event delegation for edit, delete, and resend buttons
  container.addEventListener("click", async e => {
    const editBtn = e.target.closest(".btn--edit");
    const deleteBtn = e.target.closest(".btn--delete");
    const resendBtn = e.target.closest(".btn--resend");

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
        document.getElementById("userId").value = userId; // Populate the user ID field
        toggleFormFields(form, false);
        document.getElementById("modalTitle").textContent = "Edit User";
        toggleModal("userModal", true);
      }
    }

    if (deleteBtn) {
      const userId = deleteBtn.dataset.id;
      const userName = deleteBtn.dataset.name;
      const userEmail = deleteBtn.dataset.email;
      const userPhoto = deleteBtn.dataset.photo;

      document.getElementById("deleteUserPicture").src =
        userPhoto || "/img/users/default.jpg";
      document.getElementById("deleteUserName").textContent = userName || "";
      document.getElementById("deleteUserEmail").textContent = userEmail || "";

      handleUserDelete(userId);
    }

    if (resendBtn) {
      const userId = resendBtn.dataset.id;
      const email = resendBtn.dataset.email;
      await handleResendConfirmation(userId, email);
    }
  });

  // Initialize search handlers
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", handleRoleFilter);
  }

  // Initialize modal handlers
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

  if (cancelUserBtn) {
    cancelUserBtn.addEventListener("click", () => {
      const form = document.getElementById("userForm");
      if (form) form.reset();
      toggleModal("userModal", false);
    });
  }

  // Initialize pagination handlers
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

  if (closeDeleteModalBtn) {
    closeDeleteModalBtn.addEventListener("click", () =>
      toggleModal("deleteUserModal", false),
    );
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () =>
      toggleModal("deleteUserModal", false),
    );
  }

  // Initial load
  handleUserLoad();
};

export const initializeUserManagement = () => {
  const container = elements.user.usersContainer();
  if (!container) return;

  initializeEventListeners();
  handleUserLoad();
};
