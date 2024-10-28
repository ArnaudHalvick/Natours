import axios from "axios";
import { showAlert } from "./alert";

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/signup",
      data: {
        name,
        email,
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Account created successfully! Redirecting...");
      setTimeout(() => (window.location.href = "/"), 1500);
    }
  } catch (err) {
    // Check if there are multiple validation errors
    if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
      // Collect all error messages into a single string
      const messages = err.response.data.errors.map(err => err.msg).join(". ");
      showAlert("error", messages);
    } else {
      // Handle a generic or single error message
      showAlert(
        "error",
        err.response?.data?.message ||
          "Error signing up. Please try again later.",
      );
    }
  }
};
