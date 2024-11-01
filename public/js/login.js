import axios from "axios";
import { showAlert } from "./alert";

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
        location.assign("/verify-2fa"); // Redirect to 2FA verification page
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
