import axios from "axios";
import { showAlert } from "./alert";

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/signup",
      data: { name, email, password, passwordConfirm },
    });

    if (res.data.status === "success") {
      showAlert(
        "success",
        "Account created successfully! Please check your email to confirm.",
      );
      setTimeout(() => (window.location.href = "/checkEmail"), 2000);
    }
  } catch (err) {
    const messages =
      err.response?.data?.errors?.map(error => error.msg).join(". ") ||
      err.response?.data?.message ||
      "Error signing up. Please try again later.";
    showAlert("error", messages);
  }
};
