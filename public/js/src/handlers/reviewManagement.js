// handlers/reviewManagement.js
import { debounce } from "../utils/dom";
import { showAlert } from "../utils/alert";
import { updatePaginationInfo } from "../utils/pagination";
import { loadReviews, hideReview, deleteReview } from "../api/reviewManagement";

let currentPage = 1;
const REVIEWS_PER_PAGE = 10;

const updateReviewsTable = reviews => {
  const reviewsContainer = document.querySelector(".reviews-container tbody");
  if (!reviewsContainer) return;

  reviewsContainer.innerHTML = reviews
    .map(
      review => `
    <tr id="review-${review._id}">
      <td>${review.tour ? review.tour.name : "Deleted Tour"}</td>
      <td>${review.user ? review.user.name : "Deleted User"}</td>
      <td>${review.review}</td>
      <td>${review.rating}</td>
      <td>
        <button class="btn-hide" data-id="${review._id}">Hide</button>
        <button class="btn-delete" data-id="${review._id}">Delete</button>
      </td>
    </tr>
  `,
    )
    .join("");
};

const handleReviewLoad = async (search = "", tourId = "", rating = "") => {
  try {
    const { data, pagination } = await loadReviews(
      currentPage,
      REVIEWS_PER_PAGE,
      search,
      tourId,
      rating,
    );
    updateReviewsTable(data);
    updatePaginationInfo(pagination.currentPage, pagination.totalPages);
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error loading reviews");
  }
};

export const initReviewManagement = () => {
  const searchInput = document.getElementById("searchReview");
  const tourFilter = document.getElementById("tourFilter");
  const ratingFilter = document.getElementById("ratingFilter");
  const reviewsContainer = document.querySelector(".reviews-container tbody");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        currentPage = 1;
        handleReviewLoad(
          searchInput.value,
          tourFilter.value,
          ratingFilter.value,
        );
      }, 300),
    );
  }

  if (tourFilter) {
    tourFilter.addEventListener("change", () => {
      currentPage = 1;
      handleReviewLoad(searchInput.value, tourFilter.value, ratingFilter.value);
    });
  }

  if (ratingFilter) {
    ratingFilter.addEventListener("change", () => {
      currentPage = 1;
      handleReviewLoad(searchInput.value, tourFilter.value, ratingFilter.value);
    });
  }

  if (reviewsContainer) {
    reviewsContainer.addEventListener("click", async e => {
      const hideBtn = e.target.closest(".btn-hide");
      const deleteBtn = e.target.closest(".btn-delete");
      const reviewId = hideBtn?.dataset.id || deleteBtn?.dataset.id;

      if (!reviewId) return;

      try {
        if (hideBtn) {
          await hideReview(reviewId);
          showAlert("success", "Review hidden successfully");
        } else if (
          deleteBtn &&
          confirm("Are you sure you want to delete this review?")
        ) {
          await deleteReview(reviewId);
          showAlert("success", "Review deleted successfully");
        }
        handleReviewLoad(
          searchInput.value,
          tourFilter.value,
          ratingFilter.value,
        );
      } catch (err) {
        showAlert(
          "error",
          err.response?.data?.message || "Error updating review",
        );
      }
    });
  }

  // Initial load
  handleReviewLoad();
};