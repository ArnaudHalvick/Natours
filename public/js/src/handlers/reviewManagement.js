// handlers/reviewManagement.js

import { debounce, toggleModal } from "../utils/dom";
import { showAlert } from "../utils/alert";
import { updatePaginationInfo } from "../utils/pagination";
import {
  loadReviews,
  hideReview,
  deleteReview,
} from "../api/reviewManagementAPI";

let currentPage = 1;
const REVIEWS_PER_PAGE = 10;

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

const handleReviewDeleteModal = (reviewId, tour, user, reviewText, rating) => {
  // Elements
  const deleteReviewModal = document.getElementById("deleteReviewModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteReviewBtn");
  const closeDeleteModalBtn = document.querySelector(
    "#deleteReviewModal .close-delete-modal",
  );
  const cancelDeleteBtn = document.getElementById("cancelDeleteReviewBtn");

  // Populate the modal with review info
  document.getElementById("deleteReviewTour").textContent = tour || "";
  document.getElementById("deleteReviewUser").textContent = user || "";
  document.getElementById("deleteReviewRating").textContent = rating || "";
  document.getElementById("deleteReviewText").textContent = reviewText || "";

  // Open the modal
  toggleModal("deleteReviewModal", true);

  // Handler to confirm deletion
  const confirmHandler = async () => {
    try {
      await deleteReview(reviewId);
      showAlert("success", "Review deleted successfully");
      handleReviewLoad(); // Reload the table
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Error deleting review",
      );
    } finally {
      // Cleanup
      toggleModal("deleteReviewModal", false);
      confirmDeleteBtn.removeEventListener("click", confirmHandler);
    }
  };

  // Handler to close modal (cancel or close button)
  const cancelHandler = () => {
    toggleModal("deleteReviewModal", false);
    confirmDeleteBtn.removeEventListener("click", confirmHandler);
  };

  // Attach listeners
  confirmDeleteBtn.addEventListener("click", confirmHandler);
  cancelDeleteBtn.addEventListener("click", cancelHandler);
  closeDeleteModalBtn.addEventListener("click", cancelHandler);
};

const updateReviewsTable = reviews => {
  const reviewsContainer = document.querySelector(".reviews-container tbody");
  if (!reviewsContainer) return;

  reviewsContainer.innerHTML = reviews
    .map(review => {
      const hiddenClass = review.hidden ? "review--hidden" : "";
      const hideButtonText = review.hidden ? "Unhide" : "Hide";

      return `
        <tr id="review-${review._id}" class="${hiddenClass}">
          <td>${review.tour ? review.tour.name : "Deleted Tour"}</td>
          <td>${review.user ? review.user.name : "Deleted User"}</td>
          <td class="review-text">${review.review}</td>
          <td class="rating">${review.rating}</td>
          <td>
            <button class="btn-hide btn--green" data-id="${review._id}" data-hidden="${review.hidden}">
              ${hideButtonText}
            </button>
            <button
              class="btn-delete btn--red"
              data-id="${review._id}"
              data-tour="${review.tour ? review.tour.name : "Deleted Tour"}"
              data-user="${review.user ? review.user.name : "Deleted User"}"
              data-review="${review.review}"
              data-rating="${review.rating}"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
};

export const initReviewManagement = () => {
  const reviewManagementElements = document.querySelector(".reviews-container");
  if (!reviewManagementElements) return;

  const searchInput = document.getElementById("searchReview");
  const tourFilter = document.getElementById("tourFilter");
  const ratingFilter = document.getElementById("ratingFilter");
  const reviewsContainer = document.querySelector(".reviews-container tbody");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  // Add pagination event listeners
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        handleReviewLoad(
          searchInput.value,
          tourFilter.value,
          ratingFilter.value,
        );
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      currentPage++;
      handleReviewLoad(searchInput.value, tourFilter.value, ratingFilter.value);
    });
  }

  // Add search and filter event listeners
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

  // Listen for Hide or Delete button clicks in the table
  if (reviewsContainer) {
    reviewsContainer.addEventListener("click", async e => {
      const hideBtn = e.target.closest(".btn-hide");
      const deleteBtn = e.target.closest(".btn-delete");

      if (hideBtn) {
        const reviewId = hideBtn.dataset.id;
        const currentlyHidden = hideBtn.dataset.hidden === "true";
        const newHidden = !currentlyHidden;
        try {
          await hideReview(reviewId, newHidden);
          showAlert(
            "success",
            newHidden
              ? "Review hidden successfully"
              : "Review unhidden successfully",
          );
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
      }

      if (deleteBtn) {
        // Collect data to show in the modal
        const reviewId = deleteBtn.dataset.id;
        const tour = deleteBtn.dataset.tour;
        const user = deleteBtn.dataset.user;
        const reviewText = deleteBtn.dataset.review;
        const rating = deleteBtn.dataset.rating;

        // Show the modal instead of confirm()
        handleReviewDeleteModal(reviewId, tour, user, reviewText, rating);
      }
    });
  }

  // Initial load
  handleReviewLoad();
};
