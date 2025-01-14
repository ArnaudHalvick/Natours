// handlers/review.js
import { elements } from "../utils/elements";
import { createReview, updateReview, deleteReview } from "../api/reviewAPI";

export const initReviewHandlers = () => {
  const { form, editForm, deleteBtn } = elements.review;

  if (form()) {
    form().addEventListener("submit", e => {
      e.preventDefault();
      const rating = +document.getElementById("rating").value;
      const reviewText = document.getElementById("review").value;
      const tourId = form().dataset.tourId;
      createReview(tourId, rating, reviewText);
    });
  }

  if (editForm()) {
    editForm().addEventListener("submit", e => {
      e.preventDefault();
      const rating = +document.getElementById("rating").value;
      const reviewText = document.getElementById("review").value;
      const reviewId = editForm().dataset.reviewId;
      updateReview(reviewId, rating, reviewText);
    });

    if (deleteBtn()) {
      deleteBtn().addEventListener("click", e => {
        e.preventDefault();
        const reviewId = editForm().dataset.reviewId;
        if (confirm("Are you sure you want to delete this review?")) {
          deleteReview(reviewId);
        }
      });
    }
  }
};
