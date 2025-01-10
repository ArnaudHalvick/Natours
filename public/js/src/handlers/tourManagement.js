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

    updatePaginationInfo(currentPage, totalPages);
  } catch (err) {
    console.error("Load error:", err);
    showAlert("error", "Failed to load tours");
  }
};

const populateLocationInputs = (locations = []) => {
  const container = document.getElementById("locationsContainer");
  container.innerHTML = "";

  locations.forEach((location, index) => {
    const locationHtml = `
      <div class="location-inputs" data-index="${index}">
        <input type="text" class="form__input location-address" placeholder="Address" value="${location.address || ""}" required>
        <input type="text" class="form__input location-description" placeholder="Description" value="${location.description || ""}" required>
        <input type="text" class="form__input location-coordinates" placeholder="Coordinates (lng,lat)" value="${location.coordinates?.join(",") || ""}" required>
        <input type="number" class="form__input location-day" placeholder="Day" value="${location.day || ""}" required>
        <button type="button" class="btn btn--small btn--red remove-location">Remove</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", locationHtml);
  });
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

    // Populate start location
    if (tour.startLocation) {
      form.querySelector("#startLocationAddress").value =
        tour.startLocation.address || "";
      form.querySelector("#startLocationDesc").value =
        tour.startLocation.description || "";
      form.querySelector("#startLocationCoords").value =
        tour.startLocation.coordinates?.join(",") || "";
    }

    // Show existing cover image if exists
    const currentCoverImage = document.getElementById("currentCoverImage");
    if (tour.imageCover) {
      currentCoverImage.src = `/img/tours/${tour.imageCover}`;
      currentCoverImage.style.display = "block";
    } else {
      currentCoverImage.style.display = "none";
    }

    // Show existing tour images
    const tourImagesContainer = document.getElementById("tourImagesContainer");
    tourImagesContainer.innerHTML = "";
    if (tour.images?.length) {
      tour.images.forEach(img => {
        tourImagesContainer.insertAdjacentHTML(
          "beforeend",
          `
          <img src="/img/tours/${img}" alt="" class="preview-image">
        `,
        );
      });
    }

    // Populate locations and dates
    populateLocationInputs(tour.locations);
    populateStartDates(tour.startDates);

    // Set form data attributes
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

  // Handle start location
  const startLocation = {
    type: "Point",
    address: form.querySelector("#startLocationAddress").value,
    description: form.querySelector("#startLocationDesc").value,
    coordinates: form
      .querySelector("#startLocationCoords")
      .value.split(",")
      .map(Number),
  };
  formData.delete("startLocationAddress");
  formData.delete("startLocationDesc");
  formData.delete("startLocationCoords");
  formData.append("startLocation", JSON.stringify(startLocation));

  // Handle locations
  const locations = Array.from(form.querySelectorAll(".location-inputs")).map(
    div => ({
      type: "Point",
      address: div.querySelector(".location-address").value,
      description: div.querySelector(".location-description").value,
      coordinates: div
        .querySelector(".location-coordinates")
        .value.split(",")
        .map(Number),
      day: parseInt(div.querySelector(".location-day").value),
    }),
  );
  formData.append("locations", JSON.stringify(locations));

  // Handle dates
  const startDates = Array.from(form.querySelectorAll(".date-inputs")).map(
    div => ({
      date: div.querySelector(".start-date").value,
      participants: 0,
    }),
  );
  formData.append("startDates", JSON.stringify(startDates));

  try {
    if (tourId) {
      await updateTour(tourId, formData);
      showAlert("success", "Tour updated successfully");
    } else {
      await createTour(formData);
      showAlert("success", "Tour created successfully");
    }

    document.getElementById("tourModal").classList.remove("active");
    await handleTourLoad();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving tour");
  }
};

const handleDeleteTour = async tourId => {
  if (!confirm("Are you sure you want to delete this tour?")) return;

  try {
    await deleteTour(tourId);
    showAlert("success", "Tour deleted successfully");
    document.getElementById("tourModal").classList.remove("active");
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
  const addLocationBtn = document.getElementById("addLocationBtn");
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
      populateLocationInputs();
      populateStartDates();
      document.getElementById("currentCoverImage").style.display = "none";
      document.getElementById("tourImagesContainer").innerHTML = "";
      modal.classList.add("active");
    }
  });

  tourForm?.addEventListener("submit", handleFormSubmit);

  closeModalBtn?.addEventListener("click", () => {
    document.getElementById("tourModal")?.classList.remove("active");
  });

  deleteTourBtn?.addEventListener("click", () => {
    const tourId = tourForm.dataset.tourId;
    if (tourId) handleDeleteTour(tourId);
  });

  addLocationBtn?.addEventListener("click", () => {
    const locations = document.querySelectorAll(".location-inputs");
    populateLocationInputs([
      ...Array.from(locations).map(div => ({
        address: div.querySelector(".location-address").value,
        description: div.querySelector(".location-description").value,
        coordinates: div
          .querySelector(".location-coordinates")
          .value.split(","),
        day: div.querySelector(".location-day").value,
      })),
      {},
    ]);
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

  // Event delegation for removing locations and dates
  document.addEventListener("click", e => {
    if (e.target.matches(".remove-location")) {
      e.target.closest(".location-inputs").remove();
    } else if (e.target.matches(".remove-date")) {
      e.target.closest(".date-inputs").remove();
    }
  });
};

export const initializeTourManagement = () => {
  if (!document.querySelector(".user-view__content")) return;
  initializeEventListeners();
  handleTourLoad();
};
