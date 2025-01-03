// login.js
import axios from "axios";
import { showAlert } from "./alert";

export const verify2FA = async code => {
  try {
    // Retrieve the temporary token from localStorage
    const tempToken = localStorage.getItem("tempToken");

    // Make the API request with the temporary token in the Authorization header
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/verify2FA",
      headers: {
        Authorization: `Bearer ${tempToken}`,
      },
      data: {
        code,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Login successful!");
      localStorage.removeItem("tempToken"); // Remove the temporary token

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
      // Store the temporary token in localStorage
      localStorage.setItem("tempToken", res.data.tempToken);

      showAlert("success", "2FA code sent to your email. Please check.");

      // Redirect to 2FA verification page after 1 second
      window.setTimeout(() => {
        location.assign("/verify-2fa");
      }, 1000);
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      showAlert("error", err.response.data.message);
    } else {
      // Fallback if something else goes wrong
      showAlert("error", "Something went wrong, please try again.");
    }
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
    showAlert("error", "Error logging out. Try again!");
  }
};
