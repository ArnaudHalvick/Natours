import { showAlert } from "../utils/alert";
import {
  fetchBookings,
  fetchBookingById,
  updateBooking,
} from "../api/bookingManagementAPI";
import { debounce } from "../utils/dom";

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

    // Fetch tour details to get available start dates
    const tourResponse = await axios.get(`/api/v1/tours/${booking.tour._id}`);
    const tour = tourResponse.data.data.data;

    // Update non-editable booking info
    document.getElementById("bookingId").textContent = booking._id;
    document.getElementById("bookingUser").textContent = booking.user.email;
    document.getElementById("bookingTour").textContent = booking.tour.name;

    // Update payment info
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

    // Update start date select with available dates
    const startDateInput = document.getElementById("startDate");
    if (startDateInput) {
      // Convert startDate select to a proper select element
      const startDateSelect = document.createElement("select");
      startDateSelect.id = "startDate";
      startDateSelect.className = "form__input";
      startDateSelect.required = true;

      // Get current booking date for comparison
      const currentBookingDate = new Date(booking.startDate);
      const formattedCurrentDate = currentBookingDate
        .toISOString()
        .split("T")[0];

      // Add options for each available start date
      tour.startDates
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(dateObj => {
          const date = new Date(dateObj.date);
          const formattedDate = date.toISOString().split("T")[0];
          const availableSpots = tour.maxGroupSize - dateObj.participants;

          // Add current booking's participants back to available spots if this is the current date
          const isCurrentDate = formattedDate === formattedCurrentDate;
          const actualAvailableSpots = isCurrentDate
            ? availableSpots + booking.numParticipants
            : availableSpots;

          // Only show dates that have available spots or is the current booking date
          if (actualAvailableSpots > 0 || isCurrentDate) {
            const option = document.createElement("option");
            option.value = formattedDate;
            option.textContent = `${date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })} (${actualAvailableSpots} spots)`;
            option.selected = formattedDate === formattedCurrentDate;
            startDateSelect.appendChild(option);
          }
        });

      // Replace the date input with our select
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

    numParticipantsInput.value = booking.numParticipants || 1;
    priceInput.value = booking.price || "";
    paidInput.value = booking.paid.toString();

    form.dataset.bookingId = bookingId;
    modal.classList.add("active");
  } catch (err) {
    showAlert("error", `Error loading booking details: ${err.message}`);
  }
};

const handleSaveBooking = async (bookingId, data) => {
  try {
    const result = await updateBooking(bookingId, data);
    if (result.status === "success") {
      showAlert("success", "Booking updated successfully!");
      const modal = document.getElementById("bookingModal");
      modal?.classList.remove("active");
      await loadBookings();
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error updating booking");
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

  elements.searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadBookings();
    }, 300),
  );

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

  elements.bookingTableBody?.addEventListener("click", e => {
    const editBtn = e.target.closest(".btn--edit");
    if (editBtn) {
      handleEditClick(editBtn.dataset.id);
    }
  });

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

  elements.closeModalBtn?.addEventListener("click", () => {
    elements.bookingModal?.classList.remove("active");
  });

  elements.cancelBtn?.addEventListener("click", () => {
    const form = document.getElementById("bookingForm");
    if (form) form.reset();
    elements.bookingModal?.classList.remove("active");
  });

  loadBookings();
};
