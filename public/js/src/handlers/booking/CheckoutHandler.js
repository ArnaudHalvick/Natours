// handlers/booking/CheckoutHandler.js
import { bookTour } from "../../api/bookingAPI";
import { showAlert } from "../../utils/alert";
import { getStripeKey } from "../../config";

class CheckoutHandler {
  constructor() {
    this.initializeStripe();
    this.form = document.getElementById("bookingForm");
    if (this.form) {
      this.bindEvents();
    }
  }

  initializeStripe() {
    if (typeof Stripe === "undefined") {
      console.error("Stripe not loaded");
      showAlert("error", "Payment system not loaded. Please refresh the page.");
      return;
    }

    try {
      this.stripe = Stripe(getStripeKey());
      console.log("Stripe initialized successfully");
    } catch (error) {
      console.error("Stripe initialization error:", error);
      showAlert("error", "Failed to initialize payment system");
    }
  }

  bindEvents() {
    const boundHandler = this.handleSubmit.bind(this);
    this.form.removeEventListener("submit", boundHandler);
    this.form.addEventListener("submit", boundHandler);
  }

  async handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const startDateSelect = document.getElementById("startDate");
      const numParticipantsInput = document.getElementById("numParticipants");
      const bookTourBtn = document.getElementById("bookTour");

      if (
        !startDateSelect?.value ||
        !numParticipantsInput?.value ||
        !bookTourBtn?.dataset?.tourId
      ) {
        throw new Error("Missing required booking information");
      }

      bookTourBtn.textContent = "Processing...";
      bookTourBtn.disabled = true;

      await bookTour(
        bookTourBtn.dataset.tourId,
        startDateSelect.value,
        numParticipantsInput.value,
      );
    } catch (error) {
      console.error("Booking submission error:", error);
      showAlert(
        "error",
        error.message || "Failed to process booking. Please try again.",
      );
      const bookTourBtn = document.getElementById("bookTour");
      if (bookTourBtn) {
        bookTourBtn.textContent = "Book now";
        bookTourBtn.disabled = false;
      }
    }

    return false;
  }
}

export const initCheckoutHandler = () => new CheckoutHandler();
    