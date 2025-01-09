// handlers/tourManagement.js
import { showAlert } from "../utils/alert";
import { debounce } from "../utils/dom";
import {
  fetchTours,
  fetchTourById,
  updateTour,
  createTour,
  deleteTour,
} from "../api/tourManagement";

let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let currentDifficulty = "";
const limit = 10;

const handleTourLoad = async () => {
  try {
    const response = await fetchTours(
      currentPage,
      limit,
      currentSearch,
      currentDifficulty,
    );
    totalPages = response.pagination.totalPages;

    const tourTableBody = document.getElementById("tourTableBody");
    if (!tourTableBody) return;

    tourTableBody.innerHTML = response.data.length
      ? response.data
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
       </td>
     </tr>
   `,
          )
          .join("")
      : '<tr><td colspan="7" class="text-center">No tours found</td></tr>';

    updatePaginationInfo();
  } catch (err) {
    console.error("Load error:", err);
  }
};

const handleEditClick = async tourId => {
  try {
    const tour = await fetchTourById(tourId);
    const modal = document.getElementById("tourModal");
    const form = document.getElementById("tourForm");
    const modalTitle = document.getElementById("modalTitle");

    if (!modal || !form) return;

    // Populate form fields
    form.elements.name.value = tour.name;
    form.elements.duration.value = tour.duration;
    form.elements.maxGroupSize.value = tour.maxGroupSize;
    form.elements.difficulty.value = tour.difficulty;
    form.elements.price.value = tour.price;
    form.elements.priceDiscount.value = tour.priceDiscount || "";
    form.elements.summary.value = tour.summary;
    form.elements.description.value = tour.description;
    form.elements.hidden.value = tour.hidden.toString();

    // Set data attributes for form submission
    form.dataset.tourId = tourId;
    modalTitle.textContent = "Edit Tour";
    modal.classList.add("active");
  } catch (err) {
    showAlert("error", "Failed to load tour details");
  }
};

const handleFormSubmit = async e => {
  e.preventDefault();
  const form = e.target;
  const tourId = form.dataset.tourId;
  const formData = new FormData(form);

  try {
    if (tourId) {
      await updateTour(tourId, Object.fromEntries(formData));
      showAlert("success", "Tour updated successfully");
    } else {
      await createTour(Object.fromEntries(formData));
      showAlert("success", "Tour created successfully");
    }

    document.getElementById("tourModal").classList.remove("active");
    await handleTourLoad();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving tour");
  }
};

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

const initializeEventListeners = () => {
  const searchInput = document.getElementById("searchTour");
  const difficultyFilter = document.getElementById("difficultyFilter");
  const tourTableBody = document.getElementById("tourTableBody");
  const createTourBtn = document.getElementById("createTourBtn");
  const tourForm = document.getElementById("tourForm");
  const closeModalBtn = document.querySelector(".close-modal");

  searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      handleTourLoad();
    }, 300),
  );

  difficultyFilter?.addEventListener("change", e => {
    currentDifficulty = e.target.value;
    currentPage = 1;
    handleTourLoad();
  });

  // Pagination handlers
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      handleTourLoad();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      handleTourLoad();
    }
  });

  // Tour edit handler
  tourTableBody?.addEventListener("click", e => {
    const editBtn = e.target.closest(".btn--edit");
    if (editBtn) {
      handleEditClick(editBtn.dataset.id);
    }
  });

  // Create tour handler
  createTourBtn?.addEventListener("click", () => {
    const modal = document.getElementById("tourModal");
    if (modal && tourForm) {
      tourForm.reset();
      tourForm.removeAttribute("data-tour-id");
      document.getElementById("modalTitle").textContent = "Create New Tour";
      modal.classList.add("active");
    }
  });

  // Form submission
  tourForm?.addEventListener("submit", handleFormSubmit);

  // Modal close handler
  closeModalBtn?.addEventListener("click", () => {
    document.getElementById("tourModal")?.classList.remove("active");
  });
};

export const initializeTourManagement = () => {
  if (!document.querySelector(".user-view__content")) return;
  initializeEventListeners();
  handleTourLoad();
};
