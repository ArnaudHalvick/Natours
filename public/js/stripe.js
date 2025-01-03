import { showAlert } from "./alert";
import axios from "axios";

// Function to initiate the booking process for a tour
export const bookTour = async (tourId, startDate, numParticipants) => {
  // Check if Stripe library is loaded
  if (typeof Stripe === "undefined") {
    showAlert(
      "error",
      "Unable to load payment. Please refresh the page or try again.",
    );
    return; // Stop function if Stripe is not loaded
  }

  // Initialize Stripe with the publishable key
  const stripe = Stripe(
    "pk_test_51QE9Pr01SQ3XzN0XdG38jyXT83vljVXop3ZXsPSSvKBz9nk98c3gcTyoIHvO3vAXocBSuUwWDSnAflmrstAcIqHM00hseI1ZMn",
  );

  try {
    // 1) Fetch the checkout session from the API with the tour ID, startDate, and numParticipants
    const session = await axios.get(
      `/api/v1/bookings/checkout-session/${tourId}?startDate=${encodeURIComponent(
        startDate,
      )}&numParticipants=${encodeURIComponent(numParticipants)}`,
    );

    // 2) Redirect to Stripe's checkout page using the session ID
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      showAlert("error", error.response.data.message);
    } else {
      showAlert(
        "error",
        "Something went wrong with booking the tour. Please try again.",
      );
    }

    // Reset the button text to 'Book Now' or appropriate text
    const bookBtn = document.getElementById("bookTour");
    if (bookBtn) {
      bookBtn.textContent = "Book Now";
    }
  }
};

export const addTravelersToBooking = async (bookingId, numParticipants) => {
  try {
    // Check if Stripe library is loaded
    if (typeof Stripe === "undefined") {
      showAlert(
        "error",
        "Unable to load payment. Please refresh the page or try again.",
      );
      return;
    }

    const stripe = Stripe(
      "pk_test_51QE9Pr01SQ3XzN0XdG38jyXT83vljVXop3ZXsPSSvKBz9nk98c3gcTyoIHvO3vAXocBSuUwWDSnAflmrstAcIqHM00hseI1ZMn",
    );

    // Get the tour ID from the submit button
    const tourId = document.querySelector(".add-travelers-submit").dataset
      .tourId;

    // Make a POST request to the "Add Travelers" API endpoint
    const response = await axios.post(
      `/api/v1/bookings/${bookingId}/add-travelers`,
      {
        tourId, // Add tourId to the request body
        numParticipants,
      },
    );

    // Get the Stripe Checkout Session from the response
    const session = response.data.session;

    // Redirect to Stripe's checkout page
    await stripe.redirectToCheckout({
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error:", error.response?.data || error);
    showAlert("error", error.response?.data?.message || "Something went wrong");
  }
};
