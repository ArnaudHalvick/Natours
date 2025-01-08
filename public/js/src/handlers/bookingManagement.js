// handlers/bookingManagement.js
import { showAlert } from "../utils/alert";
import {
  fetchBookings,
  fetchBookingById,
  updateBooking,
} from "../api/bookingManagement";

const debounce = (fn, delay) => {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
};

let currentPage = 1;
let totalPages = 1;
let currentFilter = "";
let currentSearch = "";
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
          <td>$${booking.price.toFixed(2)}</td>
          <td>${booking.paid ? "Paid" : "Unpaid"}</td>
          <td>
            <button class="btn btn--small btn--edit" data-id="${booking._id}">Edit</button>
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
  console.log("Starting edit process for booking:", bookingId);
  try {
    const form = document.getElementById("bookingForm");
    const modal = document.getElementById("bookingModal");

    if (!form || !modal) {
      throw new Error("Modal or form elements not found in DOM");
    }

    const booking = await fetchBookingById(bookingId);
    console.log("Retrieved booking:", booking);

    if (!booking) {
      throw new Error("No booking data received");
    }

    const startDateInput = document.getElementById("startDate");
    const priceInput = document.getElementById("price");
    const paidInput = document.getElementById("paid");

    if (!startDateInput || !priceInput || !paidInput) {
      const missingInputs = [
        !startDateInput && "startDate",
        !priceInput && "price",
        !paidInput && "paid",
      ].filter(Boolean);

      throw new Error(`Missing form inputs: ${missingInputs.join(", ")}`);
    }

    startDateInput.value = new Date(booking.startDate)
      .toISOString()
      .split("T")[0];
    priceInput.value = booking.price || "";
    paidInput.value = booking.paid.toString();

    form.dataset.bookingId = bookingId;
    modal.classList.add("active");
    console.log("Modal activated successfully");
  } catch (err) {
    console.error("Error in handleEditClick:", err);
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
    statusFilter: document.getElementById("statusFilter"),
    dateFromInput: document.getElementById("startDateFrom"),
    dateToInput: document.getElementById("startDateTo"),
    prevPageBtn: document.getElementById("prevPage"),
    nextPageBtn: document.getElementById("nextPage"),
    bookingTableBody: document.getElementById("bookingTableBody"),
    bookingModal: document.getElementById("bookingModal"),
    bookingForm: document.getElementById("bookingForm"),
    closeModalBtn: document.querySelector(".close-modal"),
  };

  elements.searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadBookings();
    }, 300),
  );

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
      price: parseFloat(document.getElementById("price").value),
      paid: document.getElementById("paid").value === "true",
    };

    handleSaveBooking(bookingId, data);
  });

  elements.closeModalBtn?.addEventListener("click", () => {
    elements.bookingModal?.classList.remove("active");
  });

  elements.bookingModal?.addEventListener("click", e => {
    if (e.target === elements.bookingModal) {
      elements.bookingModal.classList.remove("active");
    }
  });

  loadBookings();
};
