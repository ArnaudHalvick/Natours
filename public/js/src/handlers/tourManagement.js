// handlers/tourManagement.js
import { showAlert } from "../utils/alert";
import { debounce } from "../utils/dom";
import {
  fetchTours,
  fetchTourById,
  updateTour,
  createTour,
  deleteTour,
  fetchAvailableGuides,
} from "../api/tourManagementAPI";
import { updatePaginationInfo } from "../utils/pagination";
import { LocationManager } from "../utils/locationManager";

const limit = 10;
let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let currentDifficulty = "";
let locationManager;
let availableGuides = { leadGuides: [], regularGuides: [] };

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
              <button class="btn btn--small btn--edit btn--green" data-id="${tour._id}">Edit</button>
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
  try {
    if (locationManager) {
      locationManager.destroy(); // Fully destroy the previous instance
    }
    locationManager = new LocationManager();
    if (locations.length > 0) {
      locationManager.setLocations(locations);
    }
  } catch (error) {
    console.error("Failed to initialize location manager:", error);
  }
};

const loadGuides = async () => {
  try {
    const guides = await fetchAvailableGuides();
    availableGuides = guides;

    const leadGuideSelect = document.getElementById("leadGuide");
    const guide1Select = document.getElementById("guide1");
    const guide2Select = document.getElementById("guide2");

    if (!leadGuideSelect || !guide1Select || !guide2Select) return;

    // Clear existing options
    [leadGuideSelect, guide1Select, guide2Select].forEach(select => {
      select.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select Guide";
      select.appendChild(defaultOption);
    });

    // For lead guide select, include both lead guides and regular guides for backward compatibility
    const allGuides = [...guides.leadGuides, ...guides.regularGuides];

    // Populate lead guide select
    allGuides.forEach(guide => {
      const option = document.createElement("option");
      option.value = guide._id || guide.id;
      option.textContent = `${guide.name} (${guide.role === "lead-guide" ? "Lead Guide" : "Guide"})`;
      leadGuideSelect.appendChild(option.cloneNode(true));
    });

    // Populate other guide selects
    allGuides.forEach(guide => {
      const option = document.createElement("option");
      option.value = guide._id || guide.id;
      option.textContent = `${guide.name} (${guide.role === "lead-guide" ? "Lead Guide" : "Guide"})`;
      guide1Select.appendChild(option.cloneNode(true));
      guide2Select.appendChild(option.cloneNode(true));
    });
  } catch (err) {
    console.error("Failed to load guides:", err);
    showAlert("error", "Failed to load available guides");
  }
};

// Update the handleEditClick function to populate guides
const populateExistingGuides = tour => {
  const leadGuideSelect = document.getElementById("leadGuide");
  const guide1Select = document.getElementById("guide1");
  const guide2Select = document.getElementById("guide2");

  if (!tour.guides || !Array.isArray(tour.guides)) {
    // If no guides or invalid guides data, just ensure dropdowns are enabled
    guide1Select.disabled = false;
    guide2Select.disabled = false;
    return;
  }

  // Find lead guide and other guides
  const leadGuide = tour.guides.find(g => g.role === "lead-guide");
  const otherGuides = tour.guides.filter(g => g.role !== "lead-guide");

  // Populate lead guide if exists
  if (leadGuide && leadGuideSelect) {
    leadGuideSelect.value = leadGuide.id || leadGuide._id;
  }

  // Populate other guides
  if (otherGuides.length > 0 && guide1Select) {
    guide1Select.value = otherGuides[0].id || otherGuides[0]._id;
    guide1Select.disabled = false;
  }

  if (otherGuides.length > 1 && guide2Select) {
    guide2Select.value = otherGuides[1].id || otherGuides[1]._id;
    guide2Select.disabled = false;
  } else if (guide2Select) {
    // If there's no second guide, disable the second select unless first is populated
    guide2Select.disabled = !guide1Select.value;
  }
};

// Add to handleFormSubmit function when creating formData
const addGuidesToFormData = formData => {
  const leadGuideId = document.getElementById("leadGuide").value;
  const guide1Id = document.getElementById("guide1").value;
  const guide2Id = document.getElementById("guide2").value;

  // For existing tours without a lead guide, allow any guide type
  if (!leadGuideId && !guide1Id && !guide2Id) {
    return; // No guides selected, let the model handle default behavior
  }

  const guides = [];
  if (leadGuideId) guides.push(leadGuideId);
  if (guide1Id) guides.push(guide1Id);
  if (guide2Id) guides.push(guide2Id);

  formData.append("guides", JSON.stringify(guides));
};

const initializeGuideValidation = () => {
  const leadGuideSelect = document.getElementById("leadGuide");
  const guide1Select = document.getElementById("guide1");
  const guide2Select = document.getElementById("guide2");

  if (!guide1Select || !guide2Select) return;

  // Handle guide1 changes
  guide1Select.addEventListener("change", () => {
    if (!guide1Select.value) {
      guide2Select.value = "";
      guide2Select.disabled = true;
    } else {
      guide2Select.disabled = false;
    }
  });

  // Initial state
  if (!guide1Select.value) {
    guide2Select.disabled = true;
  }
};

const handleEditClick = async tourId => {
  try {
    const tour = await fetchTourById(tourId);
    const modal = document.getElementById("tourModal");
    const form = document.getElementById("tourForm");
    const modalTitle = document.getElementById("modalTitle");
    const deleteTourBtn = document.getElementById("deleteTourBtn");

    if (!modal || !form) return;

    // Show the "Delete Tour" button for existing tours
    if (deleteTourBtn) deleteTourBtn.style.display = "block";

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

    populateExistingGuides(tour);

    initializeLocationManager(tour.locations, false);

    if (tour.startLocation) {
      locationManager.setStartLocation(tour.startLocation);
    }

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

    populateStartDates(tour.startDates);

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
    addGuidesToFormData(formData);

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

    // Send request to create or update tour
    if (tourId) {
      await updateTour(tourId, formData); // Wait for the update response
    } else {
      await createTour(formData); // Wait for the creation response
    }

    showAlert(
      "success",
      tourId ? "Tour updated successfully" : "Tour created successfully",
    );
    modal.classList.remove("active");
    await handleTourLoad(); // Reload the list of tours
  } catch (err) {
    console.error("Form submit error:", err);
    showAlert("error", err.response?.data?.message || "Error saving tour");
  } finally {
    // Always restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
};

const handleCancelClick = () => {
  const modal = document.getElementById("tourModal");
  if (modal) {
    modal.classList.remove("active");
    if (locationManager) {
      locationManager.cleanup();
    }
  }
};

const handleDeleteTour = async tourId => {
  try {
    await deleteTour(tourId); // your API call
    showAlert("success", "Tour deleted successfully");

    // Close the modals
    const deleteModal = document.getElementById("deleteConfirmationModal");
    const editModal = document.getElementById("tourModal");

    deleteModal.classList.remove("active");
    editModal.classList.remove("active");

    // Cleanup location manager
    if (locationManager) locationManager.cleanup();

    // Reload tours
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
  const cancelTourBtn = document.getElementById("cancelTourBtn");
  const addStartDateBtn = document.getElementById("addStartDateBtn");

  const deleteModal = document.getElementById("deleteConfirmationModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const closeDeleteModalBtn = document.querySelector(".close-delete-modal");

  // Event listener for closing modal on Esc key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const modal = document.getElementById("tourModal");
      if (modal && modal.classList.contains("active")) {
        handleCancelClick();
      }

      const deleteModal = document.getElementById("deleteConfirmationModal");
      if (deleteModal && deleteModal.classList.contains("active")) {
        deleteModal.classList.remove("active");
      }
    }
  });

  // Event listener for confirming deletion
  confirmDeleteBtn?.addEventListener("click", () => {
    const tourId = deleteModal.dataset.tourId;
    if (!tourId) return;
    handleDeleteTour(tourId);
  });

  // Event listeners to close the delete modal
  const closeModal = () => {
    deleteModal.classList.remove("active");
  };

  cancelDeleteBtn?.addEventListener("click", closeModal);
  closeDeleteModalBtn?.addEventListener("click", closeModal);

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
    const deleteTourBtn = document.getElementById("deleteTourBtn");
    if (modal && tourForm) {
      tourForm.reset();
      tourForm.removeAttribute("data-tour-id");
      document.getElementById("modalTitle").textContent = "Create New Tour";

      initializeLocationManager();
      populateStartDates();
      document.getElementById("currentCoverImage").style.display = "none";
      document.getElementById("tourImagesContainer").innerHTML = "";

      // Hide the "Delete Tour" button for new tours
      if (deleteTourBtn) deleteTourBtn.style.display = "none";

      modal.classList.add("active");
    }
  });

  tourForm?.addEventListener("submit", handleFormSubmit);

  closeModalBtn?.addEventListener("click", handleCancelClick);
  cancelTourBtn?.addEventListener("click", handleCancelClick);

  deleteTourBtn?.addEventListener("click", () => {
    const form = document.getElementById("tourForm");
    const tourId = form?.dataset?.tourId;

    if (!tourId) return;

    // Show the delete confirmation modal
    deleteModal.dataset.tourId = tourId;
    deleteModal.classList.add("active");
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

  loadGuides(); // Load available guides
  initializeEventListeners();
  initializeGuideValidation();
  handleTourLoad();
};
