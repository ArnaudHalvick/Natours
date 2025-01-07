import axios from "axios";
import { showAlert } from "../utils/alert";

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/login",
      data: { email, password },
    });

    if (res.data.status === "success") {
      if (res.data.tempToken) {
        localStorage.setItem("tempToken", res.data.tempToken);
        showAlert("success", "2FA code sent to your email. Please check.");
        window.setTimeout(() => {
          location.assign("/verify-2fa");
        }, 1000);
      } else {
        showAlert("success", "Logged in successfully!");
        window.setTimeout(() => {
          location.assign("/");
        }, 1500);
      }
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message;
    showAlert("error", errorMsg || "Login failed");

    if (errorMsg?.includes("not confirmed")) {
      addResendConfirmationButton(email);
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
      window.setTimeout(() => {
        location.assign("/");
      }, 1000);
    }
  } catch (err) {
    showAlert("error", "Error logging out. Try again!");
  }
};

export const verify2FA = async code => {
  try {
    const tempToken = localStorage.getItem("tempToken");
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/verify2FA",
      headers: {
        Authorization: `Bearer ${tempToken}`,
      },
      data: { code },
    });

    if (res.data.status === "success") {
      localStorage.removeItem("tempToken");
      showAlert("success", "Login successful!");
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || "2FA verification failed",
    );
  }
};

export const forgotPassword = async email => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/forgotPassword",
      data: { email },
    });

    if (res.data.status === "success") {
      showAlert("success", "Please check your email for reset instructions!");
    }
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || "Error sending reset email",
    );
  }
};

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
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Password reset failed");
  }
};

// Helper function for resend confirmation button
const addResendConfirmationButton = email => {
  const formElem = document.getElementById("loginForm");
  let existingBtn = document.getElementById("resendConfirmationBtn");

  if (!existingBtn && formElem) {
    const resendBtn = document.createElement("button");
    resendBtn.id = "resendConfirmationBtn";
    resendBtn.type = "button";
    resendBtn.textContent = "Resend Confirmation Email";
    resendBtn.className = "btn btn--small btn--green";
    resendBtn.style.marginTop = "1rem";

    formElem.appendChild(resendBtn);

    resendBtn.addEventListener("click", async () => {
      try {
        await axios.post("/api/v1/users/resendConfirmation", { email });
        showAlert("success", "New confirmation email sent!");
        resendBtn.remove();
      } catch (error) {
        showAlert("error", error.response?.data?.message || "Resend failed");
      }
    });
  }
};
