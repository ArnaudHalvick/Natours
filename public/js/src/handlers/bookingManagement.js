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
    // [Previous handleSaveBooking code remains the same until the last catch block...]
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
  const form = document.getElementById("createBookingForm");
  const dateSelect = document.getElementById("bookingDate");

  if (modal && form) {
    modal.classList.add("active");
    form.reset();
    if (dateSelect) {
      dateSelect.innerHTML = '<option value="">Select Tour First</option>';
      dateSelect.disabled = true;
    }
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
      const modal = document.getElementById("createBookingModal");
      closeModal(modal);
      await loadBookings();
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error creating booking");
  }
};

const closeModal = modalElement => {
  if (!modalElement) return;
  modalElement.classList.remove("active");
};

const handleEscKey = event => {
  if (event.key === "Escape") {
    const activeModal = document.querySelector(".modal.active");
    if (activeModal) {
      closeModal(activeModal);
    }
  }
};

const initializeCreateBooking = () => {
  const createBtn = document.getElementById("createBookingBtn");
  const createModal = document.getElementById("createBookingModal");
  const createForm = document.getElementById("createBookingForm");
  const tourSelect = document.getElementById("bookingTour");

  createBtn?.addEventListener("click", handleCreateBookingClick);
  createForm?.addEventListener("submit", handleCreateBookingSubmit);
  tourSelect?.addEventListener("change", handleTourChange);
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
    createBookingModal: document.getElementById("createBookingModal"),
    bookingForm: document.getElementById("bookingForm"),
    closeModalBtns: document.querySelectorAll(".close-modal"),
    cancelBtn: document.getElementById("cancelBtn"),
    cancelCreateBtn: document.getElementById("cancelCreateBtn"),
  };

  // Global ESC key handler
  document.addEventListener("keydown", handleEscKey);

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
  elements.closeModalBtns?.forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      closeModal(modal);
    });
  });

  elements.cancelBtn?.addEventListener("click", () => {
    closeModal(elements.bookingModal);
  });

  elements.cancelCreateBtn?.addEventListener("click", () => {
    closeModal(elements.createBookingModal);
  });

  // Initialize bookings table and create booking functionality
  initializeCreateBooking();
  loadBookings();

  // Cleanup
  return () => {
    document.removeEventListener("keydown", handleEscKey);
  };
};
