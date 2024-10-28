import axios from "axios";
import { showAlert } from "./alert";

// Create updateSettings function for updating name, email, and password
export const updateSettings = async (data, type) => {
  try {
    type === "password"
      ? (document.querySelector("#savePassword").textContent = "Updating ...")
      : (document.querySelector("#saveSettings").textContent = "Updating ...");

    const url =
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateMe";

    const res = await axios({
      method: "PATCH",
      url,
      data,
    });

    if (res.data.status === "success") {
      showAlert("success", `${type.toUpperCase()} updated successfully!`);
      window.setTimeout(() => {
        location.reload();
      }, 1000);
    }
  } catch (err) {
    // Check if there's validation error information
    const errorMessage =
      err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : err.response.data.errors // Handle Mongoose validation errors
          ? Object.values(err.response.data.errors)
              .map(el => el.message)
              .join(". ")
          : "An error occurred. Please try again.";

    showAlert("error", errorMessage);
  }
};
