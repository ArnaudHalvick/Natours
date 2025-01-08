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

  // Remove any existing event listeners
  const newUserForm = userForm.cloneNode(true);
  userForm.parentNode.replaceChild(newUserForm, userForm);

  if (createUserBtn) {
    createUserBtn.addEventListener("click", () => {
      modalTitle.textContent = "Create New User";
      newUserForm.dataset.editing = "false";
      newUserForm.reset();
      toggleFormFields(newUserForm, true);
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

    newUserForm.dataset.editing = "true";
    newUserForm.dataset.userId = userId;

    toggleFormFields(newUserForm, false);
    toggleModal("userModal", true);
  });

  // Single form submission handler
  if (newUserForm) {
    newUserForm.addEventListener("submit", async e => {
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
        location.reload();
      } catch (err) {
        console.error(err);
      }
    });
  }
};
