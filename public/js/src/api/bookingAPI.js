// api/bookingAPI.js
import axios from "axios";
import { showAlert } from "../utils/alert";
import { getStripeKey } from "../config";

export const bookTour = async (tourId, startDate, numParticipants) => {
  try {
    if (typeof Stripe === "undefined") {
      showAlert("error", "Unable to load payment. Please refresh the page.");
      return;
    }

    // Initialize Stripe with the key from data attribute
    const stripe = Stripe(getStripeKey());

    const session = await axios.get(
      `/api/v1/bookings/checkout-session/${tourId}?startDate=${encodeURIComponent(
        startDate,
      )}&numParticipants=${encodeURIComponent(numParticipants)}`,
    );

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.error("Booking error:", err);
    showAlert("error", err.response?.data?.message || "Booking error occurred");
    // Reset button text if there's an error
    const bookTourBtn = document.getElementById("bookTour");
    if (bookTourBtn) bookTourBtn.textContent = "Book now";
  }
};

export const addTravelersToBooking = async (bookingId, numParticipants) => {
  try {
    if (typeof Stripe === "undefined") {
      showAlert("error", "Unable to load payment system");
      return;
    }

    // Initialize Stripe with the key from data attribute
    const stripe = Stripe(getStripeKey());
    const tourId = document.querySelector(".add-travelers-submit").dataset
      .tourId;

    const response = await axios.post(
      `/api/v1/bookings/${bookingId}/add-travelers`,
      { tourId, numParticipants },
    );

    await stripe.redirectToCheckout({
      sessionId: response.data.session.id,
    });
  } catch (err) {
    console.error("Add travelers error:", err);
    showAlert("error", err.response?.data?.message || "Error adding travelers");
  }
};

export const requestRefund = async bookingId => {
  try {
    const response = await axios.post(`/api/v1/refunds/request/${bookingId}`);

    if (response.data.status === "success") {
      showAlert("success", "Refund requested successfully!");
      window.setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    console.error("Refund request error:", err);
    showAlert(
      "error",
      err.response?.data?.message || "Error requesting refund",
    );
  }
};
