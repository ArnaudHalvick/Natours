import axios from "axios";
import { showAlert } from "./alert";

// State management
let currentPage = 1;
let totalPages = 1;
let currentSort = "name";
let currentFilter = "";
let currentSearch = "";
const limit = 10; // Number of users per page

// Obtain the current user's ID from a data attribute in the HTML
const userContainer = document.querySelector(".user-view__users-container");
const currentUserId = userContainer
  ? userContainer.dataset.currentUserId
  : null;

// Function to load users
export const loadUsers = async () => {
  try {
    // Construct query with limit
    let query = `?page=${currentPage}&limit=${limit}&sort=${currentSort}`;
    if (currentFilter) query += `&role=${currentFilter}`;
    if (currentSearch) query += `&name=${encodeURIComponent(currentSearch)}`;

    console.log("Fetching users with query:", query);
    const res = await axios.get(`/api/v1/users${query}`);
    console.log("API Response:", res.data);

    const users = res.data.data.data;
    const pagination = res.data.data.pagination;

    // Update totalPages from the response
    totalPages = pagination.totalPages;

    const userTableBody = document.getElementById("userTableBody");
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

        // Add a CSS class based on the user's active status
        if (!user.active) {
          row.classList.add("user--inactive");
        }

        // Determine if the user is the current user
        const isCurrentUser = user._id === currentUserId;

        // Conditionally render Edit/Delete buttons
        let actionButtons = `
          <button class="btn btn--small btn--edit" data-id="${user._id}" data-active="${user.active}">Edit</button>
          <button class="btn btn--small btn--delete" data-id="${user._id}">Delete</button>
        `;

        if (isCurrentUser) {
          // Replace buttons with a label indicating it's the current user's account
          actionButtons = `<span>Your Account</span>`;
        }

        row.innerHTML = `
          <td><img src="/img/users/${user.photo}" alt="${user.name}"></td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td class="action-buttons">
            ${actionButtons}
          </td>
        `;
        userTableBody.appendChild(row);
      });
    }

    // Update page information
    document.getElementById("pageInfo").textContent =
      `Page ${currentPage} of ${totalPages}`;

    // Update button states
    updatePaginationButtons();
  } catch (err) {
    console.error("Error details:", err);
    showAlert(
      "error",
      err.response?.data?.message || err.message || "Error loading users",
    );
  }
};

// Function to update the state of pagination buttons
const updatePaginationButtons = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  // Disable Previous button if on the first page
  if (currentPage <= 1) {
    prevPageBtn.disabled = true;
    prevPageBtn.classList.add("btn--disabled");
  } else {
    prevPageBtn.disabled = false;
    prevPageBtn.classList.remove("btn--disabled");
  }

  // Disable Next button if on the last page
  if (currentPage >= totalPages) {
    nextPageBtn.disabled = true;
    nextPageBtn.classList.add("btn--disabled");
  } else {
    nextPageBtn.disabled = false;
    nextPageBtn.classList.remove("btn--disabled");
  }
};

// Function to save user (create or edit)
export const saveUser = async (userData, isEdit = false) => {
  try {
    const url = isEdit ? `/api/v1/users/${userData.id}` : "/api/v1/users";
    const method = isEdit ? "PATCH" : "POST";

    // Create different data objects for create and edit operations
    const data = isEdit
      ? {
          name: userData.name,
          role: userData.role,
          active: userData.active === "true",
        }
      : {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          passwordConfirm: userData.passwordConfirm,
          role: userData.role,
        };

    const res = await axios({
      method,
      url,
      data,
    });

    if (res.data.status === "success") {
      showAlert(
        "success",
        `User ${isEdit ? "updated" : "created"} successfully!`,
      );
      loadUsers();
      document.getElementById("userModal").classList.remove("active");
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving user");
  }
};

// Function to delete user
export const deleteUser = async userId => {
  try {
    await axios.delete(`/api/v1/users/${userId}`);
    showAlert("success", "User deleted successfully!");
    loadUsers();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error deleting user");
  }
};

// Initialize User Management
export const initializeUserManagement = () => {
  const createUserBtn = document.getElementById("createUserBtn");
  const closeModalBtn = document.querySelector(".close-modal");
  const userForm = document.getElementById("userForm");
  const searchInput = document.getElementById("searchUser");
  const roleFilter = document.getElementById("roleFilter");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const userTableBody = document.getElementById("userTableBody");
  const userModal = document.getElementById("userModal");
  const creationOnlyFields = document.querySelectorAll(".creation-only");
  const editOnlyFields = document.querySelectorAll(".edit-only");

  const toggleFormFields = isCreating => {
    creationOnlyFields.forEach(field => {
      if (isCreating) {
        field.classList.add("active");
        const input = field.querySelector("input, select");
        if (input) input.setAttribute("required", "required");
      } else {
        field.classList.remove("active");
        const input = field.querySelector("input, select");
        if (input) input.removeAttribute("required");
      }
    });

    editOnlyFields.forEach(field => {
      if (isCreating) {
        field.classList.remove("active");
      } else {
        field.classList.add("active");
      }
    });
  };

  if (createUserBtn) {
    createUserBtn.addEventListener("click", () => {
      userForm.reset();
      document.getElementById("modalTitle").textContent = "Create New User";
      userForm.dataset.editing = "false";
      toggleFormFields(true);
      userModal.classList.add("active");
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      userModal.classList.remove("active");
    });
  }

  if (userForm) {
    userForm.addEventListener("submit", e => {
      e.preventDefault();
      const isEdit = userForm.dataset.editing === "true";

      const userData = {
        name: document.getElementById("userName").value,
        role: document.getElementById("userRole").value,
        active: document.getElementById("userActive")?.value || "true",
      };

      if (!isEdit) {
        // Add creation-only fields
        userData.email = document.getElementById("userEmail").value;
        userData.password = document.getElementById("userPassword").value;
        userData.passwordConfirm = document.getElementById(
          "userPasswordConfirm",
        ).value;

        // Validate password match
        if (userData.password !== userData.passwordConfirm) {
          showAlert("error", "Passwords do not match!");
          return;
        }
      }

      if (isEdit) userData.id = userForm.dataset.userId;
      saveUser(userData, isEdit);
    });
  }

  // Debounce function
  const debounce = (func, delay) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(e => {
        currentSearch = e.target.value;
        currentPage = 1; // Reset to first page on new search
        loadUsers();
      }, 300),
    ); // 300ms delay
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", e => {
      currentFilter = e.target.value;
      currentPage = 1; // Reset to first page on new filter
      loadUsers();
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadUsers();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadUsers();
      }
    });
  }

  if (userTableBody) {
    userTableBody.addEventListener("click", e => {
      const target = e.target;
      if (target.classList.contains("btn--edit")) {
        const userId = target.dataset.id;

        // Prevent editing self
        if (userId === currentUserId) {
          showAlert("error", "You cannot edit your own account.");
          return;
        }

        const isActive = target.dataset.active === "true"; // Correctly retrieve active status

        // Set up edit mode
        userForm.dataset.editing = "true";
        userForm.dataset.userId = userId;

        // Find the user row and get current values
        const row = target.closest("tr");
        const name = row.children[1].textContent;
        const email = row.children[2].textContent;
        const role = row.children[3].textContent;

        // Populate the form
        document.getElementById("userName").value = name;
        document.getElementById("userEmail").value = email;
        document.getElementById("userRole").value = role;
        document.getElementById("userActive").value = isActive.toString();

        // Toggle appropriate fields
        toggleFormFields(false);

        // Show the modal
        document.getElementById("modalTitle").textContent = "Edit User";
        userModal.classList.add("active");
      } else if (target.classList.contains("btn--delete")) {
        const userId = target.dataset.id;

        // Prevent deleting self
        if (userId === currentUserId) {
          showAlert("error", "You cannot delete your own account.");
          return;
        }

        if (confirm("Are you sure you want to delete this user?")) {
          deleteUser(userId);
        }
      }
    });
  }

  // Close modal when clicking outside the modal content
  window.addEventListener("click", e => {
    if (e.target === userModal) {
      userModal.classList.remove("active");
    }
  });

  // Initial load
  loadUsers();
};
