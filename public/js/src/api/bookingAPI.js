// api/bookingAPI.js
import axios from "axios";
import { showAlert } from "../utils/alert";

export const bookTour = async (tourId, startDate, numParticipants) => {
  if (typeof Stripe === "undefined") {
    showAlert("error", "Unable to load payment. Please refresh the page.");
    return;
  }

  // Initialize Stripe with the publishable key
  const stripe = Stripe(
    "pk_test_51QE9Pr01SQ3XzN0XdG38jyXT83vljVXop3ZXsPSSvKBz9nk98c3gcTyoIHvO3vAXocBSuUwWDSnAflmrstAcIqHM00hseI1ZMn",
  );

  try {
    const session = await axios.get(
      `/api/v1/bookings/checkout-session/${tourId}?startDate=${encodeURIComponent(
        startDate,
      )}&numParticipants=${encodeURIComponent(numParticipants)}`,
    );

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
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

    // Initialize Stripe with the publishable key
    const stripe = Stripe(
      "pk_test_51QE9Pr01SQ3XzN0XdG38jyXT83vljVXop3ZXsPSSvKBz9nk98c3gcTyoIHvO3vAXocBSuUwWDSnAflmrstAcIqHM00hseI1ZMn",
    );
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
    showAlert(
      "error",
      err.response?.data?.message || "Error requesting refund",
    );
  }
};
