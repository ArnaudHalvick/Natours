// handlers/bookingManagement.js
import { showAlert } from "../utils/alert";
import { debounce } from "../utils/dom";
import {
  fetchBookings,
  fetchBookingById,
  updateBooking,
  fetchTourById,
  updateTourDates,
  processAdminRefund,
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

// helper function for date comparison
const isPastOrToday = dateStr => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight for date-only comparison
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date <= today;
};

let currentPage = 1;
let totalPages = 1;
let currentFilter = "";
let currentSearch = "";
let currentTourFilter = "";
let dateFrom = "";
let dateTo = "";
const limit = 10;

const getStatusBadge = paid => {
  let statusClass, statusText;

  switch (paid) {
    case "refunded":
      statusClass = "refunded";
      statusText = "Refunded";
      break;
    case "true":
      statusClass = "paid";
      statusText = "Paid";
      break;
    case "false":
      statusClass = "unpaid";
      statusText = "Unpaid";
      break;
  }
  return `<span class="status-badge status-badge--${statusClass}">${statusText}</span>`;
};

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

    console.log(data);

    bookingTableBody.innerHTML = data.length
      ? data
          .map(booking => {
            return `
          <tr>
            <td>${booking._id}</td>
            <td>${booking.user.email}</td>
            <td>${booking.tour.name}</td>
            <td>${new Date(booking.startDate).toLocaleDateString()}</td>
            <td>$${booking.price.toLocaleString()}</td>
            <td>${getStatusBadge(booking.paid)}</td>
            <td>
              ${
                booking.paid === "refunded"
                  ? ""
                  : `<button class="btn btn--small btn--edit btn--green" data-id="${booking._id}">Edit</button>`
              }
            </td>
          </tr>
        `;
          })
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

    if (booking.refunded) {
      showAlert("error", "Refunded bookings cannot be edited.");
      return;
    }

    // Store the original date and participants in dataset (for later comparison)
    form.dataset.originalDate = booking.startDate;
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

    // Add refund button if booking is paid and not refunded
    // Add refund button if booking is paid and not refunded
    const actionBtns = form.querySelector(".action-btns");
    if (actionBtns) {
      // First, remove any existing refund button (cleanup)
      const existingRefundBtn = actionBtns.querySelector(".refund--btn");
      if (existingRefundBtn) {
        existingRefundBtn.remove();
      }

      // Add new refund button if booking is paid and not refunded
      if (booking.paid === "true") {
        const refundBtn = document.createElement("button");
        refundBtn.className = `btn btn--small refund--btn ${
          booking.isManual ? "btn--blue" : "btn--red"
        }`;
        refundBtn.textContent = booking.isManual
          ? "Record Refund"
          : "Process Refund";

        const isPastTour = isPastOrToday(booking.startDate);

        if (isPastTour) {
          refundBtn.disabled = true;
          refundBtn.textContent = "Can't Refund";
          refundBtn.title = "Cannot refund past tours";
          refundBtn.classList.add("btn--disabled");
        } else {
          refundBtn.onclick = e => {
            e.preventDefault();
            handleRefundBooking(bookingId, booking.price, booking.isManual);
          };
        }

        const cancelBtn = actionBtns.querySelector("#cancelBtn");
        if (cancelBtn) {
          actionBtns.insertBefore(refundBtn, cancelBtn);
        }
      }
    }

    // Show modal
    modal.classList.add("active");
  } catch (err) {
    showAlert("error", `Error loading booking details: ${err.message}`);
  }
};

const handleRefundBooking = async (bookingId, price, isManual) => {
  // Customize confirmation message based on booking type
  const message = isManual
    ? `Are you sure that the client was refunded? This action cannot be undone.`
    : `Are you sure you want to process a refund for $${price.toLocaleString()}? This action cannot be undone.`;

  const confirmed = window.confirm(message);
  if (!confirmed) return;

  try {
    const result = await processAdminRefund(bookingId);

    if (result.status === "success") {
      showAlert(
        "success",
        isManual
          ? "Refund recorded successfully!"
          : "Refund processed successfully!",
      );
      const modal = document.getElementById("bookingModal");
      modal?.classList.remove("active");
      await loadBookings();
    }
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || err.message || "Error processing refund",
    );
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

let availableDates = [];

const handleCreateBookingClick = () => {
  const modal = document.getElementById("createBookingModal");
  if (modal) {
    modal.classList.add("active");
    // Reset form
    document.getElementById("createBookingForm").reset();
    // Reset the date dropdown
    const dateSelect = document.getElementById("bookingDate");
    dateSelect.innerHTML = '<option value="">Select Tour First</option>';
    dateSelect.disabled = true;
  }
};

const updateAvailableDates = async tourId => {
  try {
    const tour = await fetchTourById(tourId);
    const dateSelect = document.getElementById("bookingDate");
    dateSelect.innerHTML = '<option value="">Select Date</option>';

    if (tour && tour.startDates) {
      // Sort dates chronologically
      availableDates = tour.startDates
        .filter(date => new Date(date.date) >= new Date()) // Only future dates
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      availableDates.forEach(dateObj => {
        const availableSpots = tour.maxGroupSize - (dateObj.participants || 0);
        if (availableSpots > 0) {
          const option = document.createElement("option");
          option.value = dateObj.date;
          option.textContent = `${new Date(dateObj.date).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          )} (${availableSpots} spots available)`;
          dateSelect.appendChild(option);
        }
      });
    }

    dateSelect.disabled = false;
  } catch (err) {
    console.error("Error fetching tour dates:", err);
    showAlert("error", "Error loading tour dates");
  }
};

const handleTourChange = async e => {
  const tourId = e.target.value;
  if (tourId) {
    await updateAvailableDates(tourId);
    // Set default price from tour
    try {
      const tour = await fetchTourById(tourId);
      if (tour) {
        document.getElementById("bookingPrice").value = tour.price;
      }
    } catch (err) {
      console.error("Error fetching tour price:", err);
    }
  } else {
    const dateSelect = document.getElementById("bookingDate");
    dateSelect.innerHTML = '<option value="">Select Tour First</option>';
    dateSelect.disabled = true;
    document.getElementById("bookingPrice").value = "";
  }
};

const handleCreateBookingSubmit = async e => {
  e.preventDefault();

  const form = e.target;
  const tourId = form.bookingTour.value;
  const startDate = form.bookingDate.value;
  const userId = form.bookingUserId.value;
  const numParticipants = parseInt(form.bookingParticipants.value, 10);
  const price = parseFloat(form.bookingPrice.value);
  const paid = form.bookingPaid.value === "true";

  try {
    const res = await axios.post("/api/v1/bookings/manual", {
      tourId,
      userId,
      startDate,
      numParticipants,
      price,
      paid,
    });

    if (res.data.status === "success") {
      showAlert("success", "Booking created successfully!");
      document.getElementById("createBookingModal").classList.remove("active");
      await loadBookings(); // Refresh the bookings table
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error creating booking");
  }
};

// Add these to your initialization function
const initializeCreateBooking = () => {
  const createBtn = document.getElementById("createBookingBtn");
  const createModal = document.getElementById("createBookingModal");
  const createForm = document.getElementById("createBookingForm");
  const tourSelect = document.getElementById("bookingTour");
  const cancelBtn = document.getElementById("cancelCreateBtn");
  const closeBtn = createModal?.querySelector(".close-modal");

  createBtn?.addEventListener("click", handleCreateBookingClick);
  createForm?.addEventListener("submit", handleCreateBookingSubmit);
  tourSelect?.addEventListener("change", handleTourChange);

  // Close modal handlers
  cancelBtn?.addEventListener("click", () => {
    createModal?.classList.remove("active");
  });

  closeBtn?.addEventListener("click", () => {
    createModal?.classList.remove("active");
  });
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
  initializeCreateBooking();
  loadBookings();
};
