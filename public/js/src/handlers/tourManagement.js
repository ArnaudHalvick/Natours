// handlers/tourManagement.js
import { showAlert } from "../utils/alert";
import { debounce } from "../utils/dom";
import {
  fetchTours,
  fetchTourById,
  updateTour,
  createTour,
  deleteTour,
  toggleTourVisibility,
} from "../api/tourManagement";

let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let currentDifficulty = "";
const limit = 10;

const updatePaginationInfo = () => {
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage <= 1;
    prevPageBtn.classList.toggle("btn--disabled", currentPage <= 1);
  }
  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages;
    nextPageBtn.classList.toggle("btn--disabled", currentPage >= totalPages);
  }
};

const loadTours = async () => {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit,
    });

    if (currentSearch) params.append("search", currentSearch);
    if (currentDifficulty) params.append("difficulty", currentDifficulty);

    const response = await fetchTours(currentPage, limit, currentSearch);
    const { data, pagination } = response;

    totalPages = pagination.totalPages;
    const tourTableBody = document.getElementById("tourTableBody");

    if (!tourTableBody) return;

    tourTableBody.innerHTML = data.length
      ? data
          .map(
            tour => `
              <tr>
                <td>${tour._id}</td>
                <td>${tour.name}</td>
                <td>$${tour.price}</td>
                <td>${tour.duration} days</td>
                <td>${tour.ratingsAverage || "N/A"}</td>
                <td>${tour.hidden ? "Hidden" : "Visible"}</td>
                <td>
                  <button class="btn btn--small btn--edit" data-id="${tour._id}">Edit</button>
                  <button class="btn btn--small btn--visibility" data-id="${tour._id}" data-hidden="${tour.hidden}">
                    ${tour.hidden ? "Show" : "Hide"}
                  </button>
                  <button class="btn btn--small btn--red btn--delete" data-id="${tour._id}">Delete</button>
                </td>
              </tr>
            `,
          )
          .join("")
      : '<tr><td colspan="7" class="text-center">No tours found</td></tr>';

    updatePaginationInfo();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error loading tours");
  }
};

// Debounced search function
const debouncedSearch = debounce(value => {
  currentSearch = value;
  currentPage = 1;
  loadTours();
}, 300);

const initializeEventListeners = () => {
  // Search input
  const searchInput = document.getElementById("searchTour");

  if (searchInput) {
    searchInput.addEventListener("input", e => {
      debouncedSearch(e.target.value);
    });
  }

  // Difficulty filter
  const difficultyFilter = document.getElementById("difficultyFilter");
  if (difficultyFilter) {
    difficultyFilter.addEventListener("change", e => {
      currentDifficulty = e.target.value;
      currentPage = 1;
      loadTours();
    });
  }

  // Pagination
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadTours();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadTours();
      }
    });
  }

  // Tour table actions
  const tourTableBody = document.getElementById("tourTableBody");
  if (tourTableBody) {
    tourTableBody.addEventListener("click", async e => {
      const target = e.target;
      if (!target.classList.contains("btn")) return;

      const tourId = target.dataset.id;
      if (!tourId) return;

      try {
        if (target.classList.contains("btn--edit")) {
          await handleEditClick(tourId);
        } else if (target.classList.contains("btn--delete")) {
          if (confirm("Are you sure you want to delete this tour?")) {
            await deleteTour(tourId);
            showAlert("success", "Tour deleted successfully!");
            loadTours();
          }
        } else if (target.classList.contains("btn--visibility")) {
          const hidden = target.dataset.hidden === "false";
          await toggleTourVisibility(tourId, hidden);
          showAlert(
            "success",
            `Tour ${hidden ? "hidden" : "shown"} successfully!`,
          );
          loadTours();
        }
      } catch (err) {
        showAlert(
          "error",
          err.response?.data?.message || "Error processing request",
        );
      }
    });
  }

  // Create tour button
  const createTourBtn = document.getElementById("createTourBtn");
  if (createTourBtn) {
    createTourBtn.addEventListener("click", () => {
      const modal = document.getElementById("tourModal");
      const form = document.getElementById("tourForm");
      if (modal && form) {
        form.reset();
        form.removeAttribute("data-tour-id");
        document.getElementById("modalTitle").textContent = "Create New Tour";
        modal.classList.add("active");
      }
    });
  }

  // Modal close button
  const closeModal = document.querySelector(".close-modal");
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      const modal = document.getElementById("tourModal");
      if (modal) {
        modal.classList.remove("active");
      }
    });
  }
};

// Initialize the tour management functionality
export const initializeTourManagement = () => {
  // Check if we're on the tour management page
  const tourContainer = document.querySelector(".user-view__content"); // Changed selector

  if (!tourContainer) return;

  initializeEventListeners();
  loadTours();
};
