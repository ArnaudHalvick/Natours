// utils/elements.js
export const elements = {
  auth: {
    loginForm: () => document.querySelector("#loginForm"),
    signupForm: () => document.querySelector("#signupForm"),
    logoutBtn: () => document.querySelector("#logoutBtn"),
    twoFAForm: () => document.querySelector("#twoFAForm"),
    resetPasswordForm: () => document.querySelector("#resetPasswordForm"),
    forgotPasswordBtn: () => document.querySelector("#forgotPasswordBtn"),
  },
  user: {
    updateForm: () => document.querySelector("#updateForm"),
    passwordForm: () => document.querySelector("#passwordForm"),
    usersContainer: () => document.querySelector(".user-view__users-container"),
  },
  booking: {
    form: () => document.querySelector("#bookingForm"),
    addTravelersForm: () => document.querySelector(".add-travelers__form"),
    container: () => document.querySelector(".mytours-container"),
    bookingsContainer: () =>
      document.querySelector(".user-view__bookings-container"),
  },
  review: {
    form: () => document.querySelector("#reviewForm"),
    editForm: () => document.querySelector("#editReviewForm"),
    deleteBtn: () => document.querySelector("#deleteReviewBtn"),
  },
  refund: {
    buttons: () => document.querySelectorAll(".refund-btn"),
    modal: () => document.querySelector(".refund-modal"),
    manageButtons: () => document.querySelectorAll(".btn--manage"),
  },
  filter: {
    form: () => document.querySelector("#filterForm"),
    pagination: () => document.querySelector(".pagination"),
  },
  tour: {
    container: () => document.querySelector(".user-view__tours-container"),
    searchInput: () => document.querySelector("#searchTour"),
    difficultyFilter: () => document.querySelector("#difficultyFilter"),
    table: () => document.querySelector("#tourTableBody"),
    modal: () => document.querySelector("#tourModal"),
    form: () => document.querySelector("#tourForm"),
    pagination: {
      prev: () => document.querySelector("#prevPage"),
      next: () => document.querySelector("#nextPage"),
      info: () => document.querySelector("#pageInfo"),
    },
  },
  map: () => document.getElementById("map"),
};
