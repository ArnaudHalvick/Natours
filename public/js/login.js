import axios from "axios";
import { showAlert } from "./alert";

export const verify2FA = async code => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/verify2FA",
      data: {
        code,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Login successful!");

      // Redirect to homepage after 1.5 seconds
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/login",
      data: {
        email,
        password,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "2FA code sent to your email. Please check.");

      window.setTimeout(() => {
        location.assign("/verify-2fa"); // Redirect to 2FA verification page without query parameter
      }, 1000);
    }
  } catch (err) {
    showAlert("error", "Incorrect email address or password");
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/logout",
    });

    if (res.data.status === "success") {
      showAlert("success", "Logged out successfully!");
      location.assign("/");
    }
  } catch (err) {
    showAlert("error", "Error loggin out.  Try again!");
  }
};
