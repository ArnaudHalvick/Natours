// handlers/tourManagement.js
import { showAlert } from "../utils/alert";
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
const limit = 10;

const updatePaginationInfo = () => {
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
};

const createLocationElement = (location, index) => {
  const div = document.createElement("div");
  div.className = "location-group";
  div.innerHTML = `
    <input class="form__input" type="text" placeholder="Address" value="${location?.address || ""}" name="locations[${index}].address">
    <input class="form__input" type="text" placeholder="Coordinates (lng,lat)" value="${location?.coordinates?.join(",") || ""}" name="locations[${index}].coordinates">
    <input class="form__input" type="text" placeholder="Description" value="${location?.description || ""}" name="locations[${index}].description">
    <input class="form__input" type="number" placeholder="Day" value="${location?.day || ""}" name="locations[${index}].day">
    <button type="button" class="btn btn--small btn--red removeLocation">Remove</button>
  `;
  return div;
};

const createStartDateElement = (startDate, index) => {
  const div = document.createElement("div");
  div.className = "start-date-group";
  div.innerHTML = `
    <input class="form__input" type="date" value="${startDate?.date?.split("T")[0] || ""}" name="startDates[${index}].date">
    <input class="form__input" type="number" placeholder="Participants" value="${startDate?.participants || 0}" name="startDates[${index}].participants">
    <button type="button" class="btn btn--small btn--red removeStartDate">Remove</button>
  `;
  return div;
};

const loadTours = async () => {
  try {
    const { data, pagination } = await fetchTours(
      currentPage,
      limit,
      currentSearch,
    );
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
      : '<tr><td colspan="6" style="text-align: center;">No tours found.</td></tr>';

    updatePaginationInfo();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error loading tours");
  }
};

const handleEditClick = async tourId => {
  try {
    const tour = await fetchTourById(tourId);
    const form = document.getElementById("tourForm");
    const modal = document.getElementById("tourModal");

    // Populate form fields
    Object.keys(tour).forEach(key => {
      const input = document.getElementById(key);
      if (input && !["imageCover", "images"].includes(key)) {
        input.value = tour[key];
      }
    });

    // Handle locations
    const locationsContainer = document.getElementById("locationsContainer");
    locationsContainer.innerHTML = "";
    tour.locations.forEach((location, index) => {
      locationsContainer.appendChild(createLocationElement(location, index));
    });

    // Handle start dates
    const startDatesContainer = document.getElementById("startDatesContainer");
    startDatesContainer.innerHTML = "";
    tour.startDates.forEach((startDate, index) => {
      startDatesContainer.appendChild(createStartDateElement(startDate, index));
    });

    // Display current images
    if (tour.imageCover) {
      document.getElementById("currentCoverImage").src =
        `/img/tours/${tour.imageCover}`;
    }

    const tourImagesContainer = document.getElementById("tourImagesContainer");
    tourImagesContainer.innerHTML = tour.images
      .map(
        image => `
      <div class="image-preview">
        <img src="/img/tours/${image}" alt="Tour image">
        <button type="button" class="btn btn--small btn--red removeImage" data-image="${image}">Remove</button>
      </div>
    `,
      )
      .join("");

    form.dataset.tourId = tourId;
    modal.classList.add("active");
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || "Error loading tour details",
    );
  }
};

const handleFormSubmit = async (form, isCreate = false) => {
  try {
    const formData = new FormData(form);
    const data = {};

    // Process form data
    for (let [key, value] of formData.entries()) {
      if (key.includes("locations[") || key.includes("startDates[")) {
        const [arrayName, index, field] = key
          .match(/(\w+)\[(\d+)\]\.(\w+)/)
          .slice(1);
        if (!data[arrayName]) data[arrayName] = [];
        if (!data[arrayName][index]) data[arrayName][index] = {};
        data[arrayName][index][field] = value;
      } else {
        data[key] = value;
      }
    }

    // Process locations and start dates arrays
    if (data.locations) data.locations = Object.values(data.locations);
    if (data.startDates) data.startDates = Object.values(data.startDates);

    // Handle file uploads
    const coverImageInput = document.getElementById("imageCover");
    const tourImagesInput = document.getElementById("tourImages");

    if (coverImageInput.files.length > 0) {
      data.imageCover = coverImageInput.files[0];
    }

    if (tourImagesInput.files.length > 0) {
      data.images = Array.from(tourImagesInput.files);
    }

    // Process coordinates
    if (data.startLocation?.coordinates) {
      data.startLocation.coordinates = data.startLocation.coordinates
        .split(",")
        .map(Number);
    }

    data.locations = data.locations.map(loc => ({
      ...loc,
      coordinates: loc.coordinates.split(",").map(Number),
    }));

    if (isCreate) {
      await createTour(data);
      showAlert("success", "Tour created successfully!");
    } else {
      const tourId = form.dataset.tourId;
      await updateTour(tourId, data);
      showAlert("success", "Tour updated successfully!");
    }

    document.getElementById("tourModal").classList.remove("active");
    loadTours();
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving tour");
  }
};

const initializeEventListeners = () => {
  // Search input
  const searchInput = document.getElementById("searchTour");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadTours();
    });
  }

  // Pagination
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadTours();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadTours();
    }
  });

  // Tour table actions
  document
    .getElementById("tourTableBody")
    ?.addEventListener("click", async e => {
      const target = e.target;
      const tourId = target.dataset.id;

      if (target.classList.contains("btn--edit")) {
        handleEditClick(tourId);
      } else if (target.classList.contains("btn--delete")) {
        if (confirm("Are you sure you want to delete this tour?")) {
          try {
            await deleteTour(tourId);
            showAlert("success", "Tour deleted successfully!");
            loadTours();
          } catch (err) {
            showAlert(
              "error",
              err.response?.data?.message || "Error deleting tour",
            );
          }
        }
      } else if (target.classList.contains("btn--visibility")) {
        const hidden = target.dataset.hidden === "false";
        try {
          await toggleTourVisibility(tourId, hidden);
          showAlert(
            "success",
            `Tour ${hidden ? "hidden" : "shown"} successfully!`,
          );
          loadTours();
        } catch (err) {
          showAlert(
            "error",
            err.response?.data?.message || "Error updating tour visibility",
          );
        }
      }
    });

  // Modal handlers
  const modal = document.getElementById("tourModal");
  const form = document.getElementById("tourForm");

  document.querySelector(".close-modal")?.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  document.getElementById("createTourBtn")?.addEventListener("click", () => {
    form.reset();
    form.removeAttribute("data-tour-id");
    document.getElementById("modalTitle").textContent = "Create New Tour";
    modal.classList.add("active");
  });

  // Location handlers
  document.getElementById("addLocationBtn")?.addEventListener("click", () => {
    const container = document.getElementById("locationsContainer");
    const index = container.children.length;
    container.appendChild(createLocationElement(null, index));
  });

  // Start date handlers
  document.getElementById("addStartDateBtn")?.addEventListener("click", () => {
    const container = document.getElementById("startDatesContainer");
    const index = container.children.length;
    container.appendChild(createStartDateElement(null, index));
  });

  // Form submission
  form?.addEventListener("submit", e => {
    e.preventDefault();
    handleFormSubmit(e.target, !e.target.dataset.tourId);
  });

  // Dynamic element removal
  document.addEventListener("click", e => {
    if (e.target.classList.contains("removeLocation")) {
      e.target.closest(".location-group").remove();
    } else if (e.target.classList.contains("removeStartDate")) {
      e.target.closest(".start-date-group").remove();
    } else if (e.target.classList.contains("removeImage")) {
      e.target.closest(".image-preview").remove();
    }
  });
};

export const initializeTourManagement = () => {
  initializeEventListeners();
  loadTours();
};
