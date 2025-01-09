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

const handleTourLoad = async () => {
  try {
    const { data, pagination } = await fetchTours(
      currentPage,
      limit,
      currentSearch,
      currentDifficulty,
    );
    totalPages = pagination.totalPages;

    const tourTableBody = document.getElementById("tourTableBody");
    if (!tourTableBody) return;

    tourTableBody.innerHTML = data.length
      ? data
          .map(
            tour => `
     <tr>
       <td>${tour?._id ?? "N/A"}</td>
       <td>${tour?.name ?? "N/A"}</td>
       <td>$${tour?.price ?? "N/A"}</td>
       <td>${tour?.duration ? `${tour.duration} days` : "N/A"}</td>
       <td>${tour.ratingsAverage ? tour.ratingsAverage.toFixed(1) : "N/A"}</td>
       <td>${tour.hidden ? "Hidden" : "Visible"}</td>
       <td>
         <button class="btn btn--small btn--edit" data-id="${tour._id}">Edit</button>
         <button class="btn btn--small btn--visibility ${tour.hidden ? "btn--green" : "btn--yellow"}" 
           data-id="${tour._id}" 
           data-hidden="${tour.hidden}">
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

const handleVisibilityToggle = async (tourId, currentlyHidden) => {
  try {
    await toggleTourVisibility(tourId, !currentlyHidden);
    showAlert(
      "success",
      `Tour ${!currentlyHidden ? "hidden" : "shown"} successfully`,
    );
    await handleTourLoad();
  } catch (err) {
    showAlert("error", "Failed to update tour visibility");
  }
};

// Debounced search function
const debouncedSearch = debounce(value => {
  currentSearch = value;
  currentPage = 1;
  handleTourLoad();
}, 300);

const initializeEventListeners = () => {
  const searchInput = document.getElementById("searchTour");
  if (searchInput) {
    searchInput.addEventListener("input", e => debouncedSearch(e.target.value));
  }

  const difficultyFilter = document.getElementById("difficultyFilter");
  if (difficultyFilter) {
    difficultyFilter.addEventListener("change", e => {
      currentDifficulty = e.target.value;
      currentPage = 1;
      handleTourLoad();
    });
  }

  const prevPageBtn = document.getElementById("prevPage");
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        handleTourLoad();
      }
    });
  }

  const nextPageBtn = document.getElementById("nextPage");
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        handleTourLoad();
      }
    });
  }

  const tourTableBody = document.getElementById("tourTableBody");
  if (tourTableBody) {
    tourTableBody.addEventListener("click", async e => {
      const target = e.target;
      if (!target.classList.contains("btn")) return;

      const tourId = target.dataset.id;
      if (!tourId) return;

      try {
        if (target.classList.contains("btn--visibility")) {
          const currentlyHidden = target.dataset.hidden === "true";
          await handleVisibilityToggle(tourId, currentlyHidden);
        } else if (target.classList.contains("btn--delete")) {
          if (confirm("Are you sure you want to delete this tour?")) {
            await deleteTour(tourId);
            showAlert("success", "Tour deleted successfully");
            await handleTourLoad();
          }
        } else if (target.classList.contains("btn--edit")) {
          await handleEditClick(tourId);
        }
      } catch (err) {
        showAlert(
          "error",
          err.response?.data?.message || "Error updating tour",
        );
      }
    });
  }

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

  const closeModal = document.querySelector(".close-modal");
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      const modal = document.getElementById("tourModal");
      if (modal) modal.classList.remove("active");
    });
  }
};

export const initializeTourManagement = () => {
  const tourContainer = document.querySelector(".user-view__content");
  if (!tourContainer) return;

  initializeEventListeners();
  handleTourLoad();
};
