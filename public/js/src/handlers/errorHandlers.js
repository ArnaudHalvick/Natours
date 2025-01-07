// utils/errorHandlers.js
import { showAlert } from "./alert";

export const handleAuthError = err => {
  if (err.response?.data?.message) {
    const errorMsg = err.response.data.message;
    showAlert("error", errorMsg);

    if (errorMsg.includes("not confirmed")) {
      addResendConfirmationButton();
    }
  } else {
    showAlert("error", "Authentication failed. Please try again.");
  }
};

export const handleBookingError = err => {
  if (err.response?.data?.message) {
    showAlert("error", err.response.data.message);
  } else {
    showAlert("error", "Booking failed. Please try again.");
  }

  const bookBtn = document.getElementById("bookTour");
  if (bookBtn) bookBtn.textContent = "Book Now";
};

const addResendConfirmationButton = () => {
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

    resendBtn.addEventListener("click", handleResendConfirmation);
  }
};
