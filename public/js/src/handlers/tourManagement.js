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
import { updatePaginationInfo } from "../utils/pagination";
import { LocationManager } from "../utils/locationManager";

let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let currentDifficulty = "";
const limit = 10;
let locationManager;

const handleTourLoad = async () => {
  try {
    const { tours, pagination } = await fetchTours(
      currentPage,
      limit,
      currentSearch,
      currentDifficulty,
    );

    if (!pagination) {
      throw new Error("Pagination information is missing from the response.");
    }

    totalPages = pagination.totalPages;

    const tourTableBody = document.getElementById("tourTableBody");
    if (!tourTableBody) return;

    tourTableBody.innerHTML = tours.length
      ? tours
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

    updatePaginationInfo(currentPage, totalPages);
  } catch (err) {
    console.error("Load error:", err);
    showAlert("error", "Failed to load tours");
  }
};

const populateStartDates = (dates = []) => {
  const container = document.getElementById("startDatesContainer");
  container.innerHTML = "";

  dates.forEach((dateObj, index) => {
    const dateHtml = `
      <div class="date-inputs" data-index="${index}">
        <input type="date" class="form__input start-date" value="${dateObj.date?.split("T")[0] || ""}" required>
        <button type="button" class="btn btn--small btn--red remove-date">Remove</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", dateHtml);
  });
};

const initializeLocationManager = (locations = [], showMap = false) => {
  if (locationManager) {
    locationManager.cleanup(); // Clean up previous instance if exists
  }

  // Always initialize LocationManager, but only show map if needed
  locationManager = new LocationManager();

  if (locations.length > 0) {
    locationManager.setLocations(locations);
  }

  // Hide the map container if showMap is false
  const mapContainer = document.getElementById("map-container");
  if (mapContainer) {
    mapContainer.style.display = showMap ? "block" : "none";
  }
};

const handleEditClick = async tourId => {
  try {
    const tour = await fetchTourById(tourId);
    const modal = document.getElementById("tourModal");
    const form = document.getElementById("tourForm");
    const modalTitle = document.getElementById("modalTitle");

    if (!modal || !form) return;

    // Populate basic fields
    form.elements.name.value = tour.name || "";
    form.elements.duration.value = tour.duration || "";
    form.elements.maxGroupSize.value = tour.maxGroupSize || "";
    form.elements.difficulty.value = tour.difficulty || "easy";
    form.elements.price.value = tour.price || "";
    form.elements.priceDiscount.value = tour.priceDiscount || "";
    form.elements.summary.value = tour.summary || "";
    form.elements.description.value = tour.description || "";
    form.elements.hidden.value = tour.hidden?.toString() || "false";

    // Initialize location manager without showing the map
    initializeLocationManager(tour.locations, false);

    // Populate start location without displaying the map
    if (tour.startLocation) {
      locationManager.setStartLocation(tour.startLocation);
    }

    // Show existing cover image if exists
    const currentCoverImage = document.getElementById("currentCoverImage");
    if (tour.imageCover) {
      currentCoverImage.src = `/img/tours/${tour.imageCover}`;
      currentCoverImage.style.display = "block";
      currentCoverImage.onerror = () => {
        currentCoverImage.style.display = "none";
      };
    } else {
      currentCoverImage.style.display = "none";
    }

    // Show existing tour images
    const tourImagesContainer = document.getElementById("tourImagesContainer");
    tourImagesContainer.innerHTML = "";
    if (tour.images?.length) {
      tour.images.forEach(img => {
        const imgElement = document.createElement("img");
        imgElement.src = `/img/tours/${img}`;
        imgElement.alt = "";
        imgElement.className = "preview-image";
        imgElement.onerror = () => imgElement.remove();
        tourImagesContainer.appendChild(imgElement);
      });
    }

    // Populate dates
    populateStartDates(tour.startDates);

    // Set form data attributes
    form.dataset.tourId = tourId;
    modalTitle.textContent = "Edit Tour";
    modal.classList.add("active");
  } catch (err) {
    console.error("Edit error:", err);
    showAlert("error", "Failed to load tour details");
  }
};

const handleFormSubmit = async e => {
  e.preventDefault();

  const form = e.target;
  const tourId = form.dataset.tourId;
  const submitBtn = form.querySelector('button[type="submit"]');
  const modal = document.getElementById("tourModal");

  // Save original button text
  const originalBtnText = submitBtn.textContent;

  // Create a timeout promise
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out")), 30000); // 30 seconds
  });

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = tourId ? "Updating..." : "Creating...";

    const formData = new FormData();

    // Add basic fields
    formData.append("name", form.elements.name.value);
    formData.append("duration", form.elements.duration.value);
    formData.append("maxGroupSize", form.elements.maxGroupSize.value);
    formData.append("difficulty", form.elements.difficulty.value);
    formData.append("price", form.elements.price.value);
    formData.append("priceDiscount", form.elements.priceDiscount.value);
    formData.append("summary", form.elements.summary.value);
    formData.append("description", form.elements.description.value);
    formData.append("hidden", form.elements.hidden.value);

    // Get start location and tour locations from location manager
    const startLocation = locationManager.getStartLocation();
    const locations = locationManager.getLocations();

    formData.append("startLocation", JSON.stringify(startLocation));
    formData.append("locations", JSON.stringify(locations));

    // Handle dates
    const startDates = Array.from(form.querySelectorAll(".date-inputs")).map(
      div => ({
        date: div.querySelector(".start-date").value,
        participants: 0,
      }),
    );
    formData.append("startDates", JSON.stringify(startDates));

    // Handle files
    const imageCoverInput = document.getElementById("imageCover");
    if (imageCoverInput.files.length > 0) {
      formData.append("imageCover", imageCoverInput.files[0]);
    }

    const tourImagesInput = document.getElementById("tourImages");
    if (tourImagesInput.files.length > 0) {
      Array.from(tourImagesInput.files).forEach(file => {
        formData.append("images", file);
      });
    }

    // Race between the actual request and the timeout
    const result = await Promise.race([
      tourId ? updateTour(tourId, formData) : createTour(formData),
      timeout,
    ]);

    showAlert(
      "success",
      tourId ? "Tour updated successfully" : "Tour created successfully",
    );
    modal.classList.remove("active");
    await handleTourLoad();
  } catch (err) {
    console.error("Form submit error:", err);
    if (err.message === "Request timed out") {
      showAlert("error", "Request timed out. Please try again.");
    } else {
      showAlert("error", err.response?.data?.message || "Error saving tour");
    }
  } finally {
    // Always restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
};

const handleDeleteTour = async tourId => {
  if (!confirm("Are you sure you want to delete this tour?")) return;

  try {
    await deleteTour(tourId);
    showAlert("success", "Tour deleted successfully");
    document.getElementById("tourModal").classList.remove("active");
    locationManager.cleanup();
    await handleTourLoad();
  } catch (err) {
    showAlert("error", "Failed to delete tour");
  }
};

const initializeEventListeners = () => {
  const searchInput = document.getElementById("searchTour");
  const difficultyFilter = document.getElementById("difficultyFilter");
  const tourTableBody = document.getElementById("tourTableBody");
  const createTourBtn = document.getElementById("createTourBtn");
  const tourForm = document.getElementById("tourForm");
  const closeModalBtn = document.querySelector(".close-modal");
  const deleteTourBtn = document.getElementById("deleteTourBtn");
  const addStartDateBtn = document.getElementById("addStartDateBtn");

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

  tourTableBody?.addEventListener("click", e => {
    const editBtn = e.target.closest(".btn--edit");
    if (editBtn) {
      handleEditClick(editBtn.dataset.id);
    }
  });

  createTourBtn?.addEventListener("click", () => {
    const modal = document.getElementById("tourModal");
    if (modal && tourForm) {
      tourForm.reset();
      tourForm.removeAttribute("data-tour-id");
      document.getElementById("modalTitle").textContent = "Create New Tour";
      initializeLocationManager();
      populateStartDates();
      document.getElementById("currentCoverImage").style.display = "none";
      document.getElementById("tourImagesContainer").innerHTML = "";
      modal.classList.add("active");
    }
  });

  tourForm?.addEventListener("submit", handleFormSubmit);

  closeModalBtn?.addEventListener("click", () => {
    const modal = document.getElementById("tourModal");
    modal?.classList.remove("active");
    if (locationManager) {
      locationManager.cleanup();
    }
  });

  deleteTourBtn?.addEventListener("click", () => {
    const form = document.getElementById("tourForm");
    const tourId = form?.dataset?.tourId;

    if (tourId) {
      handleDeleteTour(tourId);
    }
  });

  addStartDateBtn?.addEventListener("click", () => {
    const dates = document.querySelectorAll(".date-inputs");
    populateStartDates([
      ...Array.from(dates).map(div => ({
        date: div.querySelector(".start-date").value,
      })),
      {},
    ]);
  });

  // Event delegation for removing dates
  document.addEventListener("click", e => {
    if (e.target.matches(".remove-date")) {
      e.target.closest(".date-inputs").remove();
    }
  });
};

export const initializeTourManagement = () => {
  if (!document.querySelector(".user-view__content")) return;
  initializeEventListeners();
  handleTourLoad();
};
