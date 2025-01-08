// api/userManagement.js
import { showAlert } from "../utils/alert";
import { toggleModal, toggleFormFields } from "../utils/dom";
import { saveUser } from "../api/user";

export const initUserManagement = () => {
  const userModal = document.getElementById("userModal");
  const userForm = document.getElementById("userForm");
  const createUserBtn = document.getElementById("createUserBtn");
  const closeModalBtn = document.querySelector(".close-modal");
  const modalTitle = document.getElementById("modalTitle");

  if (createUserBtn) {
    createUserBtn.addEventListener("click", () => {
      modalTitle.textContent = "Create New User";
      userForm.dataset.editing = "false";
      userForm.reset();
      toggleFormFields(userForm, true);
      toggleModal("userModal", true);
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      toggleModal("userModal", false);
    });
  }

  // Handle edit button clicks
  document.addEventListener("click", async e => {
    const editBtn = e.target.closest(".btn--edit");
    if (!editBtn) return;

    const userId = editBtn.dataset.id;
    const row = editBtn.closest("tr");
    const name = row.children[1].textContent.trim();
    const role = row.children[3].textContent.trim();
    const active = editBtn.dataset.active;

    modalTitle.textContent = "Edit User";
    document.getElementById("userName").value = name;
    document.getElementById("userRole").value = role;
    document.getElementById("userActive").value = active;

    userForm.dataset.editing = "true";
    userForm.dataset.userId = userId;

    toggleFormFields(userForm, false);
    toggleModal("userModal", true);
  });

  // Handle form submission
  if (userForm) {
    userForm.addEventListener("submit", async e => {
      e.preventDefault();
      const isEdit = e.target.dataset.editing === "true";

      try {
        const formData = {
          name: document.getElementById("userName").value,
          role: document.getElementById("userRole").value,
          active: document.getElementById("userActive")?.value || "true",
        };

        if (!isEdit) {
          formData.email = document.getElementById("userEmail").value;
          formData.password = document.getElementById("userPassword").value;
          formData.passwordConfirm = document.getElementById(
            "userPasswordConfirm",
          ).value;
        }

        if (isEdit) {
          formData.id = e.target.dataset.userId;
        }

        await saveUser(formData, isEdit);
        toggleModal("userModal", false);
        window.setTimeout(() => location.reload(), 1500);
      } catch (err) {
        showAlert("error", err.message || "Error saving user");
      }
    });
  }
};
