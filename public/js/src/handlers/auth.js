// handlers/auth.js
import { elements } from "../utils/elements";
import {
  login,
  logout,
  verify2FA,
  forgotPassword,
  resetPassword,
} from "../api/auth";
import { showAlert } from "../utils/alert";

export const initAuthHandlers = () => {
  const {
    loginForm,
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
