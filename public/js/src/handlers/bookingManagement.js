// handlers/bookingManagement.js
import { showAlert } from "../utils/alert";
import { debounce } from "../utils/dom";
import {
  fetchBookings,
  fetchBookingById,
  updateBooking,
  fetchTourById,
  updateTourDates,
} from "../api/bookingManagementAPI";

/**
 * Helper: convert a date (string or Date) to "YYYY-MM-DD" in UTC (midnight).
 */
function toUtcYyyymmdd(dateInput) {
  const date = new Date(dateInput);
  // Force to midnight UTC
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Return an ISO string and grab only "YYYY-MM-DD"
  return utcDate.toISOString().split("T")[0];
}

let currentPage = 1;
let totalPages = 1;
let currentFilter = "";
let currentSearch = "";
let currentTourFilter = "";
let dateFrom = "";
let dateTo = "";
const limit = 10;

const updatePaginationButtons = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
};

const loadBookings = async () => {
  try {
    const { data, pagination } = await fetchBookings(
      currentPage,
      limit,
      currentFilter,
      currentSearch,
      dateFrom,
      dateTo,
      currentTourFilter,
    );

    totalPages = pagination.totalPages;

    const bookingTableBody = document.getElementById("bookingTableBody");
    if (!bookingTableBody) return;

    bookingTableBody.innerHTML = data.length
      ? data
          .map(
            booking => `
          <tr>
            <td>${booking._id}</td>
            <td>${booking.user.email}</td>
            <td>${booking.tour.name}</td>
            <td>${new Date(booking.startDate).toLocaleDateString()}</td>
            <td class="td-price" data-total-price="${booking.price}">$${booking.price.toLocaleString()}</td>
            <td>
              <span class="status-badge status-badge--${booking.paid ? "paid" : "unpaid"}">
                ${booking.paid ? "Paid" : "Unpaid"}
              </span>
            </td>
            <td>
              <button class="btn btn--small btn--edit btn--green" data-id="${booking._id}">Edit</button>
            </td>
          </tr>
        `,
          )
          .join("")
      : '<tr><td colspan="7" style="text-align: center;">No bookings found.</td></tr>';

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    updatePaginationButtons();
  } catch (err) {
    console.error("Error loading bookings:", err);
    showAlert("error", err.response?.data?.message || "Error loading bookings");
  }
};

const handleEditClick = async bookingId => {
  try {
    const form = document.getElementById("bookingForm");
    const modal = document.getElementById("bookingModal");

    if (!form || !modal) {
      throw new Error("Modal or form elements not found in DOM");
    }

    const booking = await fetchBookingById(bookingId);
    if (!booking) {
      throw new Error("No booking data received");
    }

    // Store the original date and participants in dataset (for later comparison)
    form.dataset.originalDate = booking.startDate; // Full ISO date from backend
    form.dataset.originalParticipants = booking.numParticipants;
    form.dataset.tourId = booking.tour._id;

    // Fetch fresh tour data (so we have up-to-date participants info)
    const tour = await fetchTourById(booking.tour._id);

    // Update non-editable booking info
    document.getElementById("bookingId").textContent = booking._id;
    document.getElementById("bookingUser").textContent = booking.user.email;
    document.getElementById("bookingTour").textContent = booking.tour.name;

    // Update payment info display
    const paymentInfoElement = document.getElementById("paymentInfo");
    if (paymentInfoElement) {
      if (booking.paymentIntents?.length > 1) {
        paymentInfoElement.innerHTML = `
          <div class="payments-list">
            ${booking.paymentIntents
              .map(
                payment => `
                  <div class="payment-item">Payment: $${payment.amount.toLocaleString()}</div>
                `,
              )
              .join("")}
            <div class="payment-item payment-total">Total: $${booking.price.toLocaleString()}</div>
          </div>
        `;
      } else {
        paymentInfoElement.innerHTML = `$${booking.price.toLocaleString()}`;
      }
    }

    // Prepare to replace the startDate input with a <select>
    const startDateInput = document.getElementById("startDate");
    if (startDateInput) {
      const startDateSelect = document.createElement("select");
      startDateSelect.id = "startDate";
      startDateSelect.className = "form__input";
      startDateSelect.required = true;

      // Normalize the current booking date to "YYYY-MM-DD" (UTC)
      const formattedCurrentDate = toUtcYyyymmdd(booking.startDate);

      // Sort tour dates chronologically
      tour.startDates.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Build the <option> list
      tour.startDates.forEach(dateObj => {
        const dateIso = toUtcYyyymmdd(dateObj.date);
        const spotsLeft = tour.maxGroupSize - (dateObj.participants || 0);

        // Show this date if not sold out OR it's the current booking date
        if (spotsLeft > 0 || dateIso === formattedCurrentDate) {
          const option = document.createElement("option");
          option.value = dateIso;
          option.textContent = `${new Date(dateObj.date).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          )} (${spotsLeft} spots left)`;

          // Mark the option selected if it matches the current booking date
          if (dateIso === formattedCurrentDate) {
            option.selected = true;
          }

          startDateSelect.appendChild(option);
        }
      });

      // Replace the old input with our newly built <select>
      startDateInput.parentNode.replaceChild(startDateSelect, startDateInput);
    }

    // Update other form fields
    const numParticipantsInput = document.getElementById("numParticipants");
    const priceInput = document.getElementById("price");
    const paidInput = document.getElementById("paid");

    if (!numParticipantsInput || !priceInput || !paidInput) {
      const missingInputs = [
        !numParticipantsInput && "numParticipants",
        !priceInput && "price",
        !paidInput && "paid",
      ].filter(Boolean);
      throw new Error(`Missing form inputs: ${missingInputs.join(", ")}`);
    }

    numParticipantsInput.value = booking.numParticipants;
    priceInput.value = booking.price;
    paidInput.value = booking.paid.toString();

    // Attach bookingId to form so we know what to PATCH on submit
    form.dataset.bookingId = bookingId;

    // Show modal
    modal.classList.add("active");
  } catch (err) {
    showAlert("error", `Error loading booking details: ${err.message}`);
  }
};

const handleSaveBooking = async (bookingId, formData) => {
  try {
    const form = document.getElementById("bookingForm");
    const originalDate = form.dataset.originalDate;
    const originalParticipants = parseInt(
      form.dataset.originalParticipants,
      10,
    );
    const tourId = form.dataset.tourId;
    const newParticipants = parseInt(formData.numParticipants, 10);

    if (!tourId) {
      throw new Error("Tour ID not found");
    }

    // Get fresh tour data
    const tour = await fetchTourById(tourId);

    // Normalize both old & new date strings to "YYYY-MM-DD" to avoid timezone pitfalls
    const oldDateStr = toUtcYyyymmdd(originalDate);
    const newDateStr = toUtcYyyymmdd(formData.startDate);

    // Helper to find a date object in the tour startDates array by normalized date
    const findDateObj = (tourDates, rawDateStr) => {
      const target = toUtcYyyymmdd(rawDateStr);
      return tourDates.find(d => toUtcYyyymmdd(d.date) === target);
    };

    // If the date changed, we move participants from old date to new date
    if (oldDateStr !== newDateStr) {
      const oldDateObj = findDateObj(tour.startDates, oldDateStr);
      const newDateObj = findDateObj(tour.startDates, newDateStr);

      if (!oldDateObj || !newDateObj) {
        throw new Error("Could not find one or both dates in tour data");
      }

      // Check that the new date actually has enough available spots
      const availableSpots = tour.maxGroupSize - newDateObj.participants;
      if (availableSpots < newParticipants) {
        throw new Error(
          `Only ${availableSpots} spots available for the selected date`,
        );
      }

      // Free up spots from old date
      oldDateObj.participants = Math.max(
        0,
        oldDateObj.participants - originalParticipants,
      );

      // Take up spots in the new date
      newDateObj.participants += newParticipants;

      // Update the tour document with new participant counts
      await updateTourDates(tourId, tour.startDates);
    } else if (originalParticipants !== newParticipants) {
      // The user only changed the participant count (same date)
      const dateObj = findDateObj(tour.startDates, oldDateStr);
      if (!dateObj) {
        throw new Error("Could not find tour date");
      }

      // Remove old participant count
      dateObj.participants -= originalParticipants;
      // Add new
      dateObj.participants += newParticipants;

      // Check we did not exceed max group size
      if (dateObj.participants > tour.maxGroupSize) {
        throw new Error(
          `Cannot exceed maximum group size of ${tour.maxGroupSize}`,
        );
      }

      // Update participant count in the database
      await updateTourDates(tourId, tour.startDates);
    }

    // Update the booking document itself
    const bookingData = {
      ...formData,
      tourId,
      // Make sure to store the date in the same string format (backend can handle normalization too)
      startDate: newDateStr,
      numParticipants: newParticipants,
    };

    const result = await updateBooking(bookingId, bookingData);

    if (result.status === "success") {
      showAlert("success", "Booking updated successfully!");
      const modal = document.getElementById("bookingModal");
      modal?.classList.remove("active");
      await loadBookings();
    }
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || err.message || "Error updating booking",
    );
  }
};

export const initializeBookingManagement = () => {
  const elements = {
    searchInput: document.getElementById("searchBooking"),
    tourFilter: document.getElementById("tourFilter"),
    statusFilter: document.getElementById("statusFilter"),
    dateFromInput: document.getElementById("startDateFrom"),
    dateToInput: document.getElementById("startDateTo"),
    prevPageBtn: document.getElementById("prevPage"),
    nextPageBtn: document.getElementById("nextPage"),
    bookingTableBody: document.getElementById("bookingTableBody"),
    bookingModal: document.getElementById("bookingModal"),
    bookingForm: document.getElementById("bookingForm"),
    closeModalBtn: document.querySelector(".close-modal"),
    cancelBtn: document.getElementById("cancelBtn"),
  };

  // Search handler
  elements.searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadBookings();
    }, 300),
  );

  // Filter handlers
  elements.tourFilter?.addEventListener("change", e => {
    currentTourFilter = e.target.value;
    currentPage = 1;
    loadBookings();
  });

  elements.statusFilter?.addEventListener("change", e => {
    currentFilter = e.target.value;
    currentPage = 1;
    loadBookings();
  });

  elements.dateFromInput?.addEventListener("change", e => {
    dateFrom = e.target.value;
    loadBookings();
  });

  elements.dateToInput?.addEventListener("change", e => {
    dateTo = e.target.value;
    loadBookings();
  });

  // Pagination handlers
  elements.prevPageBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadBookings();
    }
  });

  elements.nextPageBtn?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadBookings();
    }
  });

  // Edit booking handlers
  elements.bookingTableBody?.addEventListener("click", e => {
    const editBtn = e.target.closest(".btn--edit");
    if (editBtn) {
      handleEditClick(editBtn.dataset.id);
    }
  });

  // Form submission handler
  elements.bookingForm?.addEventListener("submit", e => {
    e.preventDefault();
    const bookingId = e.target.dataset.bookingId;

    const data = {
      startDate: document.getElementById("startDate").value,
      numParticipants: parseInt(
        document.getElementById("numParticipants").value,
        10,
      ),
      price: parseFloat(document.getElementById("price").value),
      paid: document.getElementById("paid").value === "true",
    };

    handleSaveBooking(bookingId, data);
  });

  // Modal close handlers
  elements.closeModalBtn?.addEventListener("click", () => {
    elements.bookingModal?.classList.remove("active");
  });

  elements.cancelBtn?.addEventListener("click", () => {
    const form = document.getElementById("bookingForm");
    if (form) form.reset();
    elements.bookingModal?.classList.remove("active");
  });

  // Initialize bookings table
  loadBookings();
};
