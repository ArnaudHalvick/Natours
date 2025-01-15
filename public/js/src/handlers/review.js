// handlers/review.js
import { elements } from "../utils/elements";
import { createReview, updateReview, deleteReview } from "../api/reviewAPI";

const initReviewFilters = () => {
  const tourFilter = document.getElementById("tourFilter");
  const ratingFilter = document.getElementById("ratingFilter");
  const sortFilter = document.getElementById("sortFilter");
  const tbody = document.getElementById("myReviewsTableBody");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  let currentPage = 1;
  const itemsPerPage = 10;
  let filteredReviews = [];

  // Get all review rows and convert to array of objects for easier filtering
  const getAllReviews = () => {
    const rows = Array.from(tbody.getElementsByTagName("tr"));
    return rows.map(row => ({
      element: row,
      tour: row.cells[0].textContent.trim(),
      tourId: row.querySelector(".btn--blue")?.href.split("/")[4] || "",
      rating: parseInt(row.cells[1].textContent.trim()),
      review: row.cells[2].textContent.trim(),
      tourStart: row.cells[3].textContent.trim(),
      reviewDate: new Date(row.cells[4].textContent.trim()),
      hidden: row.classList.contains("review--hidden"),
    }));
  };

  const applyFilters = () => {
    const reviews = getAllReviews();
    const selectedTour = tourFilter.value;
    const selectedRating = ratingFilter.value;
    const selectedSort = sortFilter.value;

    // Apply filters
    filteredReviews = reviews.filter(review => {
      if (selectedTour && review.tourId !== selectedTour) return false;
      if (selectedRating && review.rating !== parseInt(selectedRating))
        return false;
      return true;
    });

    // Apply sorting
    filteredReviews.sort((a, b) => {
      switch (selectedSort) {
        case "reviewDateDesc":
          return b.reviewDate - a.reviewDate;
        case "reviewDateAsc":
          return a.reviewDate - b.reviewDate;
        case "startDateAsc":
          return new Date(a.tourStart) - new Date(b.tourStart);
        case "startDateDesc":
          return new Date(b.tourStart) - new Date(a.tourStart);
        default:
          return 0;
      }
    });

    currentPage = 1;
    updateDisplay();
  };

  const updateDisplay = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

    // Hide all rows
    getAllReviews().forEach(review => {
      review.element.style.display = "none";
    });

    // Show only filtered rows for current page
    filteredReviews.slice(startIndex, endIndex).forEach(review => {
      review.element.style.display = "";
    });

    // Update pagination
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  };

  // Event listeners
  tourFilter.addEventListener("change", applyFilters);
  ratingFilter.addEventListener("change", applyFilters);
  sortFilter.addEventListener("change", applyFilters);

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      updateDisplay();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      updateDisplay();
    }
  });

  // Initialize
  applyFilters();
};

export const initReviewHandlers = () => {
  const { form, editForm, deleteBtn } = elements.review;

  // Initialize filters if we're on the my-reviews page
  if (document.getElementById("myReviewsTableBody")) {
    initReviewFilters();
  }

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
