import { bookTour, addTravelersToBooking } from "./stripe";

import { signup } from "./signup";
import { login, logout, verify2FA } from "./login";
import { forgotPassword } from "./forgotPassword";
import { resetPassword } from "./resetPassword";

import { displayMap } from "./mapbox";
import { showAlert } from "./alert";

import { updateSettings } from "./updateSettings";
import { deleteReview, updateReview, createReview } from "./review";

import { initializeUserManagement } from "./manageUsers";
import {
  requestRefund,
  handleRefundAction,
  handleFilterChange,
  handlePagination,
  openModal,
  closeModal,
} from "./refund";

// Form Elements
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const userDataForm = document.querySelector("#updateForm");
const passwordForm = document.querySelector("#passwordForm");
const bookingForm = document.querySelector("#bookingForm");
const twoFAForm = document.querySelector("#twoFAForm");
const reviewForm = document.querySelector("#reviewForm");
const editReviewForm = document.querySelector("#editReviewForm");
const addTravelersForm = document.querySelector(".add-travelers__form");
const filterForm = document.querySelector("#filterForm");
const resetPasswordForm = document.querySelector("#resetPasswordForm");

// Button Elements
const logoutBtn = document.querySelector(".nav__el--logout");
const resendButton = document.querySelector("#resendCode");
const refundButtons = document.querySelectorAll(".refund-btn");
const manageButtons = document.querySelectorAll(".btn--manage");
const forgotPasswordBtn = document.querySelector("#forgotPasswordBtn");

// Other Elements
const myToursContainer = document.querySelector(".mytours-container");
const pagination = document.querySelector(".pagination");
const modal = document.querySelector(".refund-modal");
const manageUsersContainer = document.querySelector(
  ".user-view__users-container",
);

// Login Form Handler
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });
}

// Signup Form Handler
if (signupForm) {
  signupForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    signup(name, email, password, passwordConfirm);
  });
}

// User Data Update Handler
if (userDataForm) {
  userDataForm.addEventListener("submit", async e => {
    e.preventDefault();
    const form = new FormData();
    form.append("name", document.getElementById("name").value);
    form.append("email", document.getElementById("email").value);
    form.append("photo", document.getElementById("photo").files[0]);
    await updateSettings(form, "data");
  });
}

// Password Update Handler
if (passwordForm) {
  passwordForm.addEventListener("submit", async e => {
    e.preventDefault();
    const passwordData = {
      currentPassword: document.getElementById("password-current").value,
      password: document.getElementById("password").value,
      passwordConfirm: document.getElementById("password-confirm").value,
    };
    await updateSettings(passwordData, "password");
  });
}

// Map Display
document.addEventListener("DOMContentLoaded", function () {
  const mapElement = document.getElementById("map");
  if (mapElement) {
    const locations = JSON.parse(mapElement.dataset.locations);
    displayMap(locations);
  }
});

// Logout Handler
if (logoutBtn) logoutBtn.addEventListener("click", logout);

// Alert Display
const alertMessage = document.querySelector("body").dataset.alert;
if (alertMessage) showAlert("success", alertMessage, 15);

// Booking Form Handler
if (bookingForm) {
  bookingForm.addEventListener("submit", e => {
    e.preventDefault();
    const startDate = document.getElementById("startDate").value;
    const numParticipants = document.getElementById("numParticipants").value;
    const tourId = document.getElementById("bookTour").dataset.tourId;
    e.target.querySelector("#bookTour").textContent = "Processing...";
    bookTour(tourId, startDate, numParticipants);
  });
}

// 2FA Form Handler
if (twoFAForm) {
  twoFAForm.addEventListener("submit", e => {
    e.preventDefault();
    const code = document.getElementById("code").value;
    verify2FA(code);
  });
}

// Resend 2FA Code Handler
if (resendButton) {
  resendButton.addEventListener("click", async () => {
    try {
      const tempToken = localStorage.getItem("tempToken");
      await axios({
        method: "POST",
        url: "/api/v1/users/resend2FA",
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      });
      showAlert("success", "A new 2FA code has been sent to your email.");
    } catch (err) {
      showAlert("error", "Failed to resend 2FA code.");
    }
  });
}

// Event listener for "Forgot Password"
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", e => {
    e.preventDefault();
    const email = document.getElementById("email").value;

    // Use the forgotPassword function
    forgotPassword(email);
  });
}

// Event listener for "Reset Password"
if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", e => {
    e.preventDefault();
    const token = document.getElementById("resetToken").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;

    resetPassword(token, password, passwordConfirm);
  });
}

// Review Form Handler
if (reviewForm) {
  reviewForm.addEventListener("submit", e => {
    e.preventDefault();
    const rating = +document.getElementById("rating").value;
    const reviewText = document.getElementById("review").value;
    const tourId = reviewForm.dataset.tourId;
    createReview(tourId, rating, reviewText);
  });
}

// Edit Review Form Handler
if (editReviewForm) {
  editReviewForm.addEventListener("submit", e => {
    e.preventDefault();
    const rating = +document.getElementById("rating").value;
    const reviewText = document.getElementById("review").value;
    const reviewId = editReviewForm.dataset.reviewId;
    updateReview(reviewId, rating, reviewText);
  });

  const deleteReviewBtn = document.getElementById("deleteReviewBtn");
  deleteReviewBtn.addEventListener("click", e => {
    e.preventDefault();
    const reviewId = editReviewForm.dataset.reviewId;
    deleteReview(reviewId);
  });
}

// Refund Request Handler
if (refundButtons) {
  refundButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const bookingId = btn.dataset.bookingId;
      requestRefund(bookingId);
    });
  });
}

// Modal Handlers
if (modal && manageButtons.length > 0) {
  const closeModalBtn = document.getElementById("closeModalBtn");
  const processRefundBtn = document.getElementById("processRefundBtn");
  const rejectRefundBtn = document.getElementById("rejectRefundBtn");
  let currentRefundId = null;

  // Use event delegation for better handling
  document.addEventListener("click", e => {
    const manageBtn = e.target.closest(".btn--manage");
    if (manageBtn) {
      e.preventDefault();

      const refundData = {
        refundId: manageBtn.dataset.refundId,
        bookingId: manageBtn.dataset.bookingId,
        user: manageBtn.dataset.user,
        amount: parseFloat(manageBtn.dataset.amount),
        requested: manageBtn.dataset.requested,
      };

      currentRefundId = refundData.refundId;
      openModal(refundData);
    }
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (processRefundBtn) {
    processRefundBtn.addEventListener(
      "click",
      () => currentRefundId && handleRefundAction(currentRefundId, "process"),
    );
  }

  if (rejectRefundBtn) {
    rejectRefundBtn.addEventListener(
      "click",
      () => currentRefundId && handleRefundAction(currentRefundId, "reject"),
    );
  }
}

// Add Travelers Handler
if (myToursContainer) {
  myToursContainer.addEventListener("click", e => {
    const addTravelersBtn = e.target.closest(".add-travelers-btn");
    if (addTravelersBtn) {
      const bookingId = addTravelersBtn.dataset.bookingId;
      window.location.href = `/booking/${bookingId}/add-travelers`;
    }
  });
}

// Add Travelers Form Handler
if (addTravelersForm) {
  addTravelersForm.addEventListener("submit", e => {
    e.preventDefault();
    const submitBtn = document.querySelector(".add-travelers-submit");
    const bookingId = submitBtn.dataset.bookingId;
    const numParticipants = document.getElementById("numParticipants").value;
    addTravelersToBooking(bookingId, numParticipants);
  });
}

// Filter and Pagination Handlers
if (filterForm) {
  const statusSelect = document.getElementById("status");
  const sortSelect = document.getElementById("sort");

  statusSelect.addEventListener("change", handleFilterChange);
  sortSelect.addEventListener("change", handleFilterChange);
}

if (pagination) {
  pagination.addEventListener("click", e => {
    const btn = e.target.closest("[data-page]");
    if (btn) {
      e.preventDefault();
      handlePagination(btn.dataset.page);
    }
  });
}

// User Management Handler
if (manageUsersContainer) {
  initializeUserManagement();
}
