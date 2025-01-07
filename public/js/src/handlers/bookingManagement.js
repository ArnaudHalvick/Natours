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
          <td>${booking.numParticipants}</td>
          <td>$${booking.price.toFixed(2)}</td>
          <td>${booking.paid ? "Paid" : "Unpaid"}</td>
          <td>
            <button class="btn btn--small btn--edit" data-id="${booking._id}">Edit</button>
          </td>
        </tr>
      `,
          )
          .join("")
      : '<tr><td colspan="8" style="text-align: center;">No bookings found.</td></tr>';

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    updatePaginationButtons();
  } catch (err) {
    console.error("Error loading bookings:", err);
    showAlert("error", err.response?.data?.message || "Error loading bookings");
  }
};

const saveBooking = async (bookingId, data) => {
  try {
    const result = await updateBooking(bookingId, data);
    if (result.status === "success") {
      showAlert("success", "Booking updated successfully!");
      const modal = document.getElementById("bookingModal");
      if (modal) modal.classList.remove("active");
      loadBookings();
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error updating booking");
  }
};

export const initializeBookingManagement = () => {
  const searchInput = document.getElementById("searchBooking");
  const statusFilter = document.getElementById("statusFilter");
  const dateFromInput = document.getElementById("startDateFrom");
  const dateToInput = document.getElementById("startDateTo");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const bookingTableBody = document.getElementById("bookingTableBody");
  const bookingModal = document.getElementById("bookingModal");
  const bookingForm = document.getElementById("bookingForm");
  const closeModalBtn = document.querySelector(".close-modal");

  searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadBookings();
    }, 300),
  );

  statusFilter?.addEventListener("change", e => {
    currentFilter = e.target.value;
    currentPage = 1;
    loadBookings();
  });

  dateFromInput?.addEventListener("change", e => {
    dateFrom = e.target.value;
    loadBookings();
  });

  dateToInput?.addEventListener("change", e => {
    dateTo = e.target.value;
    loadBookings();
  });

  prevPageBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadBookings();
    }
  });

  nextPageBtn?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadBookings();
    }
  });

  bookingTableBody?.addEventListener("click", async e => {
    const editBtn = e.target.closest(".btn--edit");
    if (!editBtn) return;

    const bookingId = editBtn.dataset.id;
    try {
      const booking = await fetchBookingById(bookingId);

      document.getElementById("startDate").value =
        booking.startDate.split("T")[0];
      document.getElementById("numParticipants").value =
        booking.numParticipants;
      document.getElementById("price").value = booking.price;
      document.getElementById("paid").value = booking.paid;

      bookingForm.dataset.bookingId = bookingId;
      bookingModal.classList.add("active");
    } catch (err) {
      showAlert("error", "Error loading booking details");
    }
  });

  bookingForm?.addEventListener("submit", e => {
    e.preventDefault();
    const bookingId = bookingForm.dataset.bookingId;

    const data = {
      startDate: document.getElementById("startDate").value,
      numParticipants: document.getElementById("numParticipants").value,
      price: document.getElementById("price").value,
      paid: document.getElementById("paid").value === "true",
    };

    saveBooking(bookingId, data);
  });

  closeModalBtn?.addEventListener("click", () => {
    bookingModal.classList.remove("active");
  });

  loadBookings();
};
