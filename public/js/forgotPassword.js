import axios from "axios";
import { showAlert } from "./alert";

export const forgotPassword = async email => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/forgotPassword",
      data: { email },
    });

    // If successful, show a success alert
    if (res.data.status === "success") {
      showAlert("success", "Please check your email for reset instructions!");
    }
  } catch (err) {
    // Show error if something goes wrong
    if (err.response && err.response.data && err.response.data.message) {
      showAlert("error", err.response.data.message);
    } else {
      showAlert("error", "Error sending email. Please try again later.");
    }
  }
};
