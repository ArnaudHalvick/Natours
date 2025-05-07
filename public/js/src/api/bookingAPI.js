// api/bookingAPI.js
import axios from "axios";
import { showAlert } from "../utils/alert";
import { getStripeKey } from "../config";

// Helper function to initialize Stripe
const initializeStripe = () => {
  if (typeof Stripe === "undefined") {
    throw new Error("Payment system not loaded. Please refresh the page.");
  }
  return Stripe(getStripeKey());
};

// Helper function to format date consistently
const formatDateForAPI = date => {
  const dateObj = new Date(date);
  // Create date at UTC midnight
  return new Date(
    Date.UTC(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
    ),
  ).toISOString();
};

/**
 * Creates a new booking and redirects to Stripe checkout
 */
export const bookTour = async (tourId, startDate, numParticipants) => {
  try {
    const stripe = initializeStripe();
    const formattedDate = formatDateForAPI(startDate);

    // Get tour data first to calculate proper price
    const tourResponse = await axios.get(`/api/v1/tours/${tourId}`);
    const tour = tourResponse.data.data.data;

    // Use priceDiscount if available, otherwise use regular price
    const finalPrice = tour.priceDiscount || tour.price;

    // Get checkout session from our API
    const response = await axios.get(
      `/api/v1/bookings/checkout-session/${tourId}`,
      {
        params: {
          startDate: formattedDate,
          numParticipants,
          finalPrice, // Pass the calculated price to backend
        },
      },
    );

    if (!response.data?.session?.id) {
      throw new Error("Invalid session response from server");
    }

    // Redirect to Stripe checkout
    await stripe.redirectToCheckout({
      sessionId: response.data.session.id,
    });
    
    // Note: We don't need to handle the success here as Stripe will 
    // redirect to our success or cancel URL defined on the server
  } catch (err) {
    const errorMessage =
      err.response?.data?.message || err.message || "Booking error occurred";
    console.error("Booking error:", err);
    showAlert("error", errorMessage);
    throw err;
  }
};

/**
 * Adds travelers to an existing booking and redirects to Stripe checkout
 */
export const addTravelersToBooking = async (bookingId, numParticipants) => {
  try {
    const stripe = initializeStripe();
    const submitButton = document.querySelector(".add-travelers-submit");
    if (!submitButton?.dataset?.tourId) {
      throw new Error("Tour information not found");
    }

    const tourId = submitButton.dataset.tourId;

    // Get tour data first to calculate proper price
    const tourResponse = await axios.get(`/api/v1/tours/${tourId}`);
    const tour = tourResponse.data.data.data;

    // Use priceDiscount if available, otherwise use regular price
    const finalPrice = tour.priceDiscount || tour.price;

    // Get checkout session from our API
    const response = await axios.post(
      `/api/v1/bookings/${bookingId}/add-travelers`,
      {
        tourId,
        numParticipants,
        finalPrice, // Pass the calculated price to backend
      },
    );

    if (!response.data?.session?.id) {
      throw new Error("Invalid session response from server");
    }

    await stripe.redirectToCheckout({
      sessionId: response.data.session.id,
    });
  } catch (err) {
    const errorMessage =
      err.response?.data?.message || err.message || "Error adding travelers";
    console.error("Add travelers error:", err);
    showAlert("error", errorMessage);
    throw err;
  }
};

/**
 * Requests a refund for a booking
 */
export const requestRefund = async bookingId => {
  try {
    const response = await axios.post(`/api/v1/refunds/request/${bookingId}`);

    if (response.data.status === "success") {
      showAlert("success", "Refund requested successfully!");
      // Reload page after successful refund request
      window.setTimeout(() => {
        location.reload();
      }, 1500);
      return true;
    }

    throw new Error("Refund request failed");
  } catch (err) {
    const errorMessage =
      err.response?.data?.message || err.message || "Error requesting refund";
    console.error("Refund request error:", err);
    showAlert("error", errorMessage);
    throw err; // Re-throw for handler error boundary
  }
};

/**
 * Gets all bookings for the current user
 */
export const getUserBookings = async () => {
  try {
    const response = await axios.get("/api/v1/bookings/my-bookings");
    return response.data.data;
  } catch (err) {
    const errorMessage =
      err.response?.data?.message || err.message || "Error fetching bookings";
    console.error("Fetch bookings error:", err);
    showAlert("error", errorMessage);
    throw err;
  }
};
