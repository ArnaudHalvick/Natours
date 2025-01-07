import axios from "axios";
import { showAlert } from "./alert";

const debounce = (fn, delay) => {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
};

let currentSearch = "";
let currentTour = "";
let currentRating = "";

const loadReviews = async () => {
  try {
    let query = "?";
    if (currentSearch) query += `search=${encodeURIComponent(currentSearch)}`;
    if (currentTour)
      query += `${query !== "?" ? "&" : ""}tourId=${currentTour}`;
    if (currentRating)
      query += `${query !== "?" ? "&" : ""}rating=${currentRating}`;

    const res = await axios.get(`/api/v1/reviews/regex${query}`);
    const reviews = res.data.data.data;

    const tbody = document.querySelector(".reviews-container tbody");
    tbody.innerHTML = "";

    if (reviews.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No reviews found.</td></tr>`;
      return;
    }

    reviews.forEach(review => {
      const row = document.createElement("tr");
      row.id = `review-${review._id}`;
      row.innerHTML = `
        <td>${review.tour ? review.tour.name : "Deleted Tour"}</td>
        <td>${review.user ? review.user.name : "Deleted User"}</td>
        <td>${review.review}</td>
        <td>${review.rating}</td>
        <td>
          <button class="btn-hide" data-id="${review._id}">Hide</button>
          <button class="btn-delete" data-id="${review._id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error loading reviews");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const reviewContainer = document.querySelector(".reviews-container");

  // Check if we are on the manage reviews page
  if (!reviewContainer) return;

  const searchInput = document.getElementById("searchReview");
  const tourFilter = document.getElementById("tourFilter");
  const ratingFilter = document.getElementById("ratingFilter");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(e => {
        currentSearch = e.target.value;
        loadReviews();
      }, 300),
    );
  }

  if (tourFilter) {
    tourFilter.addEventListener("change", e => {
      currentTour = e.target.value;
      loadReviews();
    });
  }

  if (ratingFilter) {
    ratingFilter.addEventListener("change", e => {
      currentRating = e.target.value;
      loadReviews();
    });
  }

  reviewContainer.addEventListener("click", e => {
    const hideBtn = e.target.closest(".btn-hide");
    const deleteBtn = e.target.closest(".btn-delete");

    if (hideBtn) hideReview(hideBtn.dataset.id);
    if (deleteBtn) deleteReview(deleteBtn.dataset.id);
  });

  loadReviews();
});

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
