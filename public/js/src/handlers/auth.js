// handlers/auth.js
import { elements } from "../utils/elements";
import {
  login,
  logout,
  verify2FA,
  forgotPassword,
  resetPassword,
  signup,
  resend2FA
} from "../api/authAPI";
import { showAlert } from "../utils/alert";

export const initAuthHandlers = () => {
  const {
    loginForm,
    signupForm,
    logoutBtn,
    twoFAForm,
    resetPasswordForm,
    forgotPasswordBtn,
  } = elements.auth;

  if (loginForm()) {
    loginForm().addEventListener("submit", e => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      login(email, password);
    });
  }

  if (signupForm()) {
    signupForm().addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const passwordConfirm = document.getElementById("passwordConfirm").value;
      signup(name, email, password, passwordConfirm);
    });
  }

  if (logoutBtn()) {
    logoutBtn().addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  }

  if (twoFAForm()) {
    twoFAForm().addEventListener("submit", e => {
      e.preventDefault();
      const code = document.getElementById("code").value;
      verify2FA(code);
    });

    // Add event listener for the Resend Code button
    const resendBtn = document.getElementById("resendCode");
    if (resendBtn) {
      resendBtn.addEventListener("click", e => {
        e.preventDefault();
        resend2FA();
      });
    }
  }

  if (forgotPasswordBtn()) {
    forgotPasswordBtn().addEventListener("click", e => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      forgotPassword(email);
    });
  }

  if (resetPasswordForm()) {
    resetPasswordForm().addEventListener("submit", e => {
      e.preventDefault();
      const token = window.location.pathname.split("/").pop();
      const password = document.getElementById("password").value;
      const passwordConfirm = document.getElementById("passwordConfirm").value;
      resetPassword(token, password, passwordConfirm);
    });
  }
};
