import axios from "axios";
import { showAlert } from "./alert";

// State management
let currentPage = 1;
let currentSort = "name";
let currentFilter = "";
let currentSearch = "";

export const loadUsers = async () => {
  try {
    let query = `?page=${currentPage}&sort=${currentSort}`;
    if (currentFilter) query += `&role=${currentFilter}`;
    if (currentSearch) query += `&name=${currentSearch}`;

    console.log("Fetching users with query:", query);
    const res = await axios.get(`/api/v1/users${query}`);
    console.log("API Response:", res.data);

    const users = res.data.data.data;

    const userTableBody = document.getElementById("userTableBody");
    userTableBody.innerHTML = "";

    users.forEach(user => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><img src="/img/users/${user.photo}" alt="${user.name}"></td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td class="action-buttons">
          <button class="btn btn--small btn--edit" data-id="${user._id}">Edit</button>
          <button class="btn btn--small btn--delete" data-id="${user._id}">Delete</button>
        </td>
      `;
      userTableBody.appendChild(row);
    });

    document.getElementById("pageInfo").textContent = `Page ${currentPage}`;
  } catch (err) {
    console.error("Error details:", err);
    showAlert(
      "error",
      err.response?.data?.message || err.message || "Error loading users",
    );
  }
};

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
      document.getElementById("userModal").style.display = "none";
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving user");
  }
};

export const deleteUser = async userId => {
  try {
    await axios.delete(`/api/v1/users/${userId}`);
    showAlert("success", "User deleted successfully!");
    loadUsers();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error deleting user");
  }
};

export const initializeUserManagement = () => {
  const createUserBtn = document.getElementById("createUserBtn");
  const closeModal = document.querySelector(".close-modal");
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
        field.style.display = "block";
        field.querySelector("input")?.setAttribute("required", "required");
      } else {
        field.style.display = "none";
        field.querySelector("input")?.removeAttribute("required");
      }
    });

    editOnlyFields.forEach(field => {
      field.style.display = isCreating ? "none" : "block";
    });
  };

  if (createUserBtn) {
    createUserBtn.addEventListener("click", () => {
      userForm.reset();
      document.getElementById("modalTitle").textContent = "Create New User";
      userForm.dataset.editing = "false";
      toggleFormFields(true);
      userModal.style.display = "block";
    });
  }

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      userModal.style.display = "none";
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

  if (searchInput) {
    searchInput.addEventListener("input", e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadUsers();
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", e => {
      currentFilter = e.target.value;
      currentPage = 1;
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
      currentPage++;
      loadUsers();
    });
  }

  if (userTableBody) {
    userTableBody.addEventListener("click", e => {
      const target = e.target;
      if (target.classList.contains("btn--edit")) {
        const userId = target.dataset.id;
        // Set up edit mode
        userForm.dataset.editing = "true";
        userForm.dataset.userId = userId;

        // Find the user row and get current values
        const row = target.closest("tr");
        const name = row.children[1].textContent;
        const role = row.children[3].textContent;
        const isActive = row.children[4].textContent === "Active";

        // Populate the form
        document.getElementById("userName").value = name;
        document.getElementById("userRole").value = role;
        document.getElementById("userActive").value = isActive.toString();

        // Toggle appropriate fields
        toggleFormFields(false);

        // Show the modal
        document.getElementById("modalTitle").textContent = "Edit User";
        userModal.style.display = "block";
      } else if (target.classList.contains("btn--delete")) {
        if (confirm("Are you sure you want to delete this user?")) {
          const userId = target.dataset.id;
          deleteUser(userId);
        }
      }
    });
  }

  // Initial load
  loadUsers();
};
