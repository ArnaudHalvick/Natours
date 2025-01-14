// In userAPI.js
import axios from "axios";
import { showAlert } from "../utils/alert";

export const updateSettings = async (data, type) => {
  try {
    const url =
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateMe";

    const res = await axios({
      method: "PATCH",
      url,
      data:
        type === "password"
          ? {
              currentPassword: data.passwordCurrent,
              password: data.password,
              passwordConfirm: data.passwordConfirm,
            }
          : data,
    });

    if (res.data.status === "success") {
      showAlert(
        "success",
        res.data.message || `${type.toUpperCase()} updated successfully!`,
      );

      if (type === "password") {
        // Clear password fields
        document.getElementById("password-current").value = "";
        document.getElementById("password").value = "";
        document.getElementById("password-confirm").value = "";
      } else if (!res.data.message) {
        // Only reload if it's not an email change (which shows a verification message)
        window.setTimeout(() => location.reload(), 1500);
      }
    }

    return res.data;
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Update failed");
    throw err;
  }
};
