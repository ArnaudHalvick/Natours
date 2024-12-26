// review.js
import axios from "axios";
import { showAlert } from "./alert";

export const createReview = async (tourId, rating, reviewText) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/reviews",
      data: {
        tour: tourId,
        rating,
        review: reviewText,
      },
    });

    if (res.data.status === "success") {
      // If creation is successful
      showAlert("success", "Review submitted successfully!");
      window.setTimeout(() => {
        location.assign("/my-tours");
      }, 2000);
    }
  } catch (err) {
    // If there is an error, check if it’s a duplicate review
    // MongoDB duplicate key error => code "E11000"
    const errorMessage =
      err.response?.data?.message ||
      "Something went wrong while posting review.";

    if (errorMessage.toLowerCase().includes("duplicate")) {
      // The user already has a review for this tour
      showAlert("error", "You have already created a review for this tour.");
    } else {
      showAlert("error", errorMessage);
    }

    // In both cases, redirect after 4 seconds
    window.setTimeout(() => {
      location.assign("/my-tours");
    }, 2000);
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
      window.setTimeout(() => {
        location.assign("/my-tours");
      }, 2000);
    }
  } catch (err) {
    const errorMessage =
      err.response?.data?.message ||
      "Something went wrong while updating the review.";
    showAlert("error", errorMessage);
  }
};
