import axios from "axios";
import { showAlert } from "./alert";

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

  // Disable the "Previous" button if on the first page
  if (currentPage === 1) {
    prevPageBtn.disabled = true;
  } else {
    prevPageBtn.disabled = false;
  }

  // Disable the "Next" button if on the last page
  if (currentPage === totalPages) {
    nextPageBtn.disabled = true;
  } else {
    nextPageBtn.disabled = false;
  }
};

export const loadBookings = async () => {
  try {
    let query = `?page=${currentPage}&limit=${limit}`;
    if (currentFilter) query += `&paid=${currentFilter}`;
    if (currentSearch) query += `&search=${encodeURIComponent(currentSearch)}`;
    if (dateFrom) query += `&dateFrom=${dateFrom}`;
    if (dateTo) query += `&dateTo=${dateTo}`;

    const res = await axios.get(`/api/v1/bookings/regex${query}`);
    const bookings = res.data.data.data;
    const pagination = res.data.data.pagination;
    totalPages = pagination.totalPages;

    const bookingTableBody = document.getElementById("bookingTableBody");
    bookingTableBody.innerHTML = "";

    if (bookings.length === 0) {
      bookingTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align: center;">No bookings found.</td></tr>
      `;
      return;
    }

    bookings.forEach(booking => {
      const row = document.createElement("tr");
      row.innerHTML = `
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
      `;
      bookingTableBody.appendChild(row);
    });

    document.getElementById("pageInfo").textContent =
      `Page ${currentPage} of ${totalPages}`;

    // Update pagination buttons
    updatePaginationButtons();
  } catch (err) {
    console.error("Error loading bookings:", err);
    showAlert("error", err.response?.data?.message || "Error loading bookings");
  }
};

export const saveBooking = async (bookingId, data) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}`,
      data,
    });

    if (res.data.status === "success") {
      showAlert("success", "Booking updated successfully!");
      document.getElementById("bookingModal").classList.remove("active");
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

  // Search with debounce
  searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadBookings();
    }, 300),
  );

  // Filters
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

  // Pagination
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

  // Edit booking
  bookingTableBody?.addEventListener("click", async e => {
    const editBtn = e.target.closest(".btn--edit");
    if (!editBtn) return;

    const bookingId = editBtn.dataset.id;
    try {
      const res = await axios.get(`/api/v1/bookings/${bookingId}`);
      const booking = res.data.data.data;

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

  // Save booking changes
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

  // Close modal
  closeModalBtn?.addEventListener("click", () => {
    bookingModal.classList.remove("active");
  });

  // Initial load
  loadBookings();
};
