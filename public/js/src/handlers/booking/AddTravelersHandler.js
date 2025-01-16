// handlers/booking/AddTravelersHandler.js
import { addTravelersToBooking } from "../../api/bookingAPI";
import { hideAlert, showAlert } from "../../utils/alert";
import { getStripeKey } from "../../config";

class AddTravelersHandler {
  constructor() {
    this.initializeStripe();
    this.form = document.querySelector(".add-travelers__form");
    if (this.form) {
      this.bindEvents();
      this.initializeValidation();
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

  initializeValidation() {
    const numParticipantsInput = document.getElementById("numParticipants");
    if (numParticipantsInput) {
      numParticipantsInput.addEventListener("input", e => {
        const availableSpots = parseInt(
          document.getElementById("availableSpots").value,
        );
        const requestedSpots = parseInt(e.target.value);

        if (requestedSpots > availableSpots) {
          e.target.setCustomValidity(
            `Maximum ${availableSpots} additional participants allowed`,
          );
        } else {
          e.target.setCustomValidity("");
        }
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.querySelector(".add-travelers-submit");
    const bookingId = submitBtn.dataset.bookingId;
    const numParticipants = document.getElementById("numParticipants").value;

    const availableSpots = parseInt(
      document.getElementById("availableSpots").value,
    );
    const requestedSpots = parseInt(numParticipants);

    if (requestedSpots > availableSpots) {
      hideAlert();
      showAlert("error", `Only ${availableSpots} spots available`);
      return;
    }

    await addTravelersToBooking(bookingId, numParticipants);
  }
}

export const initAddTravelersHandler = () => new AddTravelersHandler();
