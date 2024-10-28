import { showAlert } from "./alert";
import axios from "axios";

// Function to initiate the booking process for a tour
export const bookTour = async tourId => {
  // Check if Stripe library is loaded (to avoid bugs when bundle.js says Stripe is undefined on pages where we dont load Stripe)
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
    // 1) Fetch the checkout session from the API with the tour ID
    const session = await axios.get(
      `/api/v1/bookings/checkout-session/${tourId}`,
    );

    // 2) Redirect to Stripe's checkout page using the session ID
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    console.error(error); // Log error to console for debugging

    // Show an alert if there is an error during the booking process
    showAlert(
      "error",
      error.response?.data?.message ||
        "Something went wrong with booking the tour. Please try again.",
    );
  }
};
