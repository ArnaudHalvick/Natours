// handlers/user.js
import { elements } from "../utils/elements";
import { showAlert } from "../utils/alert";
import { updateSettings } from "../api/user";

const handleSettingsUpdate = async e => {
  e.preventDefault();

  try {
    const form = e.target;
    const type = form.classList.contains("form-user-password")
      ? "password"
      : "data";

    const data =
      type === "password"
        ? {
            passwordCurrent: form.passwordCurrent.value,
            password: form.password.value,
            passwordConfirm: form.passwordConfirm.value,
          }
        : {
            name: form.name.value,
            email: form.email.value,
          };

    const res = await updateSettings(data, type);

    if (res.status === "success") {
      showAlert("success", `${type.toUpperCase()} updated successfully!`);
      window.setTimeout(() => location.reload(), 1000);
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
