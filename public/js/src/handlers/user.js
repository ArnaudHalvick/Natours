// handlers/user.js
import { elements } from "../utils/elements";
import { showAlert } from "../utils/alert";
import { updateSettings } from "../api/userAPI";

const handleSettingsUpdate = async e => {
  e.preventDefault();

  try {
    const form = e.target;
    const type = form.id === "passwordForm" ? "password" : "data";

    const data =
      type === "password"
        ? {
            passwordCurrent: document.getElementById("password-current").value,
            password: document.getElementById("password").value,
            passwordConfirm: document.getElementById("password-confirm").value,
          }
        : {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
          };

    const res = await updateSettings(data, type);

    if (res.status === "success") {
      showAlert("success", `${type.toUpperCase()} updated successfully!`);

      if (type === "password") {
        // Clear password fields
        document.getElementById("password-current").value = "";
        document.getElementById("password").value = "";
        document.getElementById("password-confirm").value = "";
      } else {
        window.setTimeout(() => location.reload(), 1500);
      }
    }
  } catch (err) {
    const errorMessage =
      err.response?.data?.message ||
      err.response?.data?.errors?.map(el => el.message).join(". ") ||
      "Update failed";
    showAlert("error", errorMessage);
  }
};

export const initUserHandlers = () => {
  const updateForm = elements.user.updateForm();
  const passwordForm = elements.user.passwordForm();

  if (updateForm) {
    updateForm.addEventListener("submit", handleSettingsUpdate);
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", handleSettingsUpdate);
  }
};
