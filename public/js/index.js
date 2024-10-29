import { login, logout } from "./login";
import { displayMap } from "./mapbox";
import { updateSettings } from "./updateSettings";
import { signup } from "./signup";
import { bookTour } from "./stripe";
import { showAlert } from "./alert";

// Element selectors for forms and buttons
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const userDataForm = document.querySelector("#updateForm");
const passwordForm = document.querySelector("#passwordForm");
const logoutBtn = document.querySelector(".nav__el--logout");
const bookBtn = document.querySelector("#bookTour");

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
    signup(name, email, password, passwordConfirm); // Call signup function
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

if (bookBtn)
  bookBtn.addEventListener("click", e => {
    e.target.textContent = "Processing ...";
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });

const alertMessage = document.querySelector("body").dataset.alert;
if (alertMessage) showAlert("success", alertMessage, 20);
