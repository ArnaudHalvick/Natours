import axios from "axios";
import { showAlert } from "./alert";

// This function sends the POST request to create a new review
export const createReview = async (tourId, rating, reviewText) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/reviews", // Using your existing /api/v1/reviews route
      data: {
        tour: tourId,
        rating,
        review: reviewText,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Review submitted successfully!");
      // Optionally redirect or reload page:
      window.setTimeout(() => {
        location.reload(); // Or location.assign(`/tour/${tourSlug}`)
      }, 1500);
    }
  } catch (err) {
    // Handle errors
    // Either show a custom message or use the error message from server
    const message = err.response?.data?.message || "Failed to post review.";
    showAlert("error", message);
  }
};
