// index.js
import { login, logout, verify2FA } from "./login";
import { displayMap } from "./mapbox";
import { updateSettings } from "./updateSettings";
import { signup } from "./signup";
import { bookTour } from "./stripe";
import { showAlert } from "./alert";
import { createReview } from "./review";

// Element selectors for forms and buttons
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const userDataForm = document.querySelector("#updateForm");
const passwordForm = document.querySelector("#passwordForm");
const logoutBtn = document.querySelector(".nav__el--logout");
const bookingForm = document.querySelector("#bookingForm");
const twoFAForm = document.querySelector("#twoFAForm");
const resendButton = document.getElementById("resendCode");
const reviewForm = document.querySelector("#reviewForm");

// Event listener for login form
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });
}

// Event listener for signup form
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

// Event listener for user data update form
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

// Event listener for password update form
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

// Display map if map element exists
document.addEventListener("DOMContentLoaded", function () {
  const mapElement = document.getElementById("map");
  if (mapElement) {
    const locations = JSON.parse(mapElement.dataset.locations);
    displayMap(locations);
  }
});

// Event listener for logout button
if (logoutBtn) logoutBtn.addEventListener("click", logout);

const alertMessage = document.querySelector("body").dataset.alert;
if (alertMessage) showAlert("success", alertMessage, 15);

// Event listener for booking form submission
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

// Event listener for 2FA form
if (twoFAForm) {
  twoFAForm.addEventListener("submit", e => {
    e.preventDefault();
    const code = document.getElementById("code").value;
    verify2FA(code);
  });
}

// Event listener for Resend 2FA Code button
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

// Event listener for Review form submission
if (reviewForm) {
  reviewForm.addEventListener("submit", e => {
    e.preventDefault();
    // Retrieve user input
    const rating = +document.getElementById("rating").value; // convert to number
    const reviewText = document.getElementById("review").value;
    // You might store the Tour ID in a data attribute:
    // <form id="reviewForm" data-tour-id="{{tour._id}}">
    const tourId = reviewForm.dataset.tourId;

    // Call our createReview function
    createReview(tourId, rating, reviewText);
  });
}
