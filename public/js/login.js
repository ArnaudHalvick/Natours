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
      data: { code },
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
      data: { email, password },
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
      const errorMsg = err.response.data.message;
      showAlert("error", errorMsg);

      // If server says "Your email is not confirmed..." we prompt "Resend"
      if (errorMsg.includes("not confirmed")) {
        const formElem = document.getElementById("loginForm");

        // 1) Check if we already created a 'Resend' button
        let existingBtn = document.getElementById("resendConfirmationBtn");
        if (!existingBtn) {
          // 2) Create the new button and make sure it's NOT a 'submit' type
          const resendBtn = document.createElement("button");
          resendBtn.id = "resendConfirmationBtn";
          resendBtn.type = "button"; // <-- Prevents form submission!
          resendBtn.textContent = "Resend Confirmation Email";
          resendBtn.className = "btn btn--small btn--green";
          resendBtn.style.marginTop = "1rem";

          formElem.appendChild(resendBtn);

          // 3) On click, call our resendConfirmation endpoint
          resendBtn.addEventListener("click", async e => {
            e.preventDefault(); // Optional extra safety
            try {
              await axios.post("/api/v1/users/resendConfirmation", { email });
              showAlert(
                "success",
                "A new confirmation email has been sent to your inbox.",
              );
              resendBtn.remove(); // Remove or disable to prevent multiple resends
            } catch (error) {
              if (
                error.response &&
                error.response.data &&
                error.response.data.message
              ) {
                showAlert("error", error.response.data.message);
              } else {
                showAlert(
                  "error",
                  "Could not resend confirmation, please try again later.",
                );
              }
            }
          });
        }
      }
    } else {
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
