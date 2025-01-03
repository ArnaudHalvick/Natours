import axios from "axios";
import { showAlert } from "./alert";

export const resetPassword = async (token, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/users/resetPassword/${token}`,
      data: {
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Password reset successful! Logging you in...");
      // Optionally redirect user or do other actions
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    if (err.response && err.response.data.message) {
      showAlert("error", err.response.data.message);
    } else {
      showAlert("error", "Something went wrong. Try again later.");
    }
  }
};
