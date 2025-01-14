// api/review.js
import axios from "axios";
import { showAlert } from "../utils/alert";

export const createReview = async (tourId, rating, reviewText) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/reviews",
      data: { tour: tourId, rating, review: reviewText },
    });

    if (res.data.status === "success") {
      showAlert("success", "Review submitted successfully!");
      window.setTimeout(() => location.assign("/my-tours"), 2000);
    }
  } catch (err) {
    const errorMessage = err.response?.data?.message || "Error posting review";
    showAlert("error", errorMessage);
    window.setTimeout(() => location.assign("/my-tours"), 2000);
  }
};

export const updateReview = async (reviewId, rating, reviewText) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/reviews/${reviewId}`,
      data: { rating, review: reviewText },
    });

    if (res.data.status === "success") {
      showAlert("success", "Review updated successfully!");
      window.setTimeout(() => location.assign("/my-tours"), 2000);
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error updating review");
  }
};

export const deleteReview = async reviewId => {
  try {
    await axios.delete(`/api/v1/reviews/${reviewId}`);
    showAlert("success", "Review deleted successfully!");
    window.setTimeout(() => location.assign("/my-tours"), 1500);
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error deleting review");
  }
};
