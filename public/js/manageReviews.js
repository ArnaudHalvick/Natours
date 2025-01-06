import axios from "axios";
import { showAlert } from "./alert";

// Elements
const reviewContainer = document.querySelector(".reviews-container");

// Function to hide a review
const hideReview = async reviewId => {
  try {
    await axios.patch(`/api/v1/reviews/${reviewId}/hide`);
    showAlert("success", "Review hidden successfully!");
    const reviewElement = document.querySelector(`#review-${reviewId}`);
    if (reviewElement) reviewElement.classList.add("hidden");
  } catch (err) {
    showAlert("error", "Failed to hide the review.");
  }
};

// Function to delete a review
const deleteReview = async reviewId => {
  try {
    await axios.delete(`/api/v1/reviews/${reviewId}`);
    showAlert("success", "Review deleted successfully!");
    const reviewElement = document.querySelector(`#review-${reviewId}`);
    if (reviewElement) reviewElement.remove();
  } catch (err) {
    showAlert("error", "Failed to delete the review.");
  }
};

// Event listeners for hide and delete actions
if (reviewContainer) {
  reviewContainer.addEventListener("click", e => {
    const hideBtn = e.target.closest(".btn-hide");
    const deleteBtn = e.target.closest(".btn-delete");

    if (hideBtn) hideReview(hideBtn.dataset.id);
    if (deleteBtn) deleteReview(deleteBtn.dataset.id);
  });
}