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
      showAlert("success", "Logged in successfully!"); // Display success alert
      window.setTimeout(() => {
        location.assign("/"); // Redirect to homepage after 1 second
      }, 1000);
    }
  } catch (err) {
    showAlert("error", "Incorrect email address or password"); // Display error alert
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
