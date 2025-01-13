// handlers/refundManagement.js
import { elements } from "../utils/elements";
import { debounce } from "../utils/dom";
import {
  requestRefund,
  processRefund,
  rejectRefund,
  fetchRefunds,
} from "../api/refundManagement";
import { showAlert } from "../utils/alert";

// State management for admin interface
let currentPage = 1;
let totalPages = 1;
let currentStatus = "";
let currentSort = "-requestedAt";
let currentSearch = "";
let dateFrom = "";
let dateTo = "";
const limit = 10;

// Admin interface functions
const updatePaginationButtons = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
};

const loadRefunds = async () => {
  try {
    const { data, pagination } = await fetchRefunds(
      currentPage,
      limit,
      currentStatus,
      currentSort,
      currentSearch,
      dateFrom,
      dateTo,
    );

    totalPages = pagination.totalPages;

    const refundTableBody = document.querySelector(".refunds-table tbody");
    if (!refundTableBody) return;

    refundTableBody.innerHTML = data.length
      ? data
          .map(
            refund => `
          <tr>
            <td>${refund.booking._id}</td>
            <td>${refund.user ? refund.user.name : "Unknown User"}</td>
            <td>$${refund.amount.toFixed(2)}</td>
            <td>${new Date(refund.requestedAt).toLocaleDateString()}</td>
            <td>${refund.processedAt ? new Date(refund.processedAt).toLocaleDateString() : "-"}</td>
            <td>${refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}</td>
            <td>
              ${
                refund.status === "pending"
                  ? `<button class="btn btn--small btn--manage" 
                      data-refund-id="${refund._id}"
                      data-booking-id="${refund.booking._id}"
                      data-user="${refund.user ? refund.user.name : "Unknown User"}"
                      data-amount="${refund.amount}"
                      data-requested="${new Date(refund.requestedAt).toLocaleDateString()}">
                      Manage
                    </button>`
                  : refund.status === "processed"
                    ? '<span class="text-success">Processed</span>'
                    : '<span class="text-danger">Rejected</span>'
              }
            </td>
          </tr>
        `,
          )
          .join("")
      : '<tr><td colspan="7" style="text-align: center;">No refund requests found.</td></tr>';

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    updatePaginationButtons();
  } catch (err) {
    console.error("Error loading refunds:", err);
    showAlert("error", err.response?.data?.message || "Error loading refunds");
  }
};

const handleManageRefund = async (action, refundId) => {
  try {
    if (action === "process") {
      await processRefund(refundId);
    } else if (action === "reject") {
      await rejectRefund(refundId);
    }

    document.querySelector(".refund-modal").classList.add("hidden");
    await loadRefunds();
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || `Error ${action}ing refund`,
    );
  }
};

// Modal functions
const openModal = refundData => {
  const modal = document.querySelector(".refund-modal");
  document.getElementById("modalBookingId").textContent = refundData.bookingId;
  document.getElementById("modalUser").textContent = refundData.user;
  document.getElementById("modalAmount").textContent =
    `$${refundData.amount.toFixed(2)}`;
  document.getElementById("modalRequestDate").textContent =
    refundData.requested;
  modal.classList.remove("hidden");
  modal.dataset.refundId = refundData.refundId;
};

const closeModal = () => {
  const modal = document.querySelector(".refund-modal");
  modal.classList.add("hidden");
};

// Initialize user-facing functionality
const initUserRefundHandlers = () => {
  const { buttons } = elements.refund;

  if (buttons()) {
    buttons().forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const bookingId = btn.dataset.bookingId;
        requestRefund(bookingId);
      });
    });
  }
};

// Initialize admin management functionality
const initAdminRefundHandlers = () => {
  // Filter and search inputs
  const searchInput = document.getElementById("search");
  const statusFilter = document.getElementById("status");
  const sortSelect = document.getElementById("sort");
  const dateFromInput = document.getElementById("dateFrom");
  const dateToInput = document.getElementById("dateTo");

  // Create debounced search function
  const debouncedSearch = debounce(() => loadRefunds(), 300);

  // Search handler with proper debouncing
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentSearch = searchInput.value;
      currentPage = 1;
      debouncedSearch();
    });
  }

  // Filter handlers - removed conditional checks for better responsiveness
  statusFilter?.addEventListener("change", () => {
    currentStatus = statusFilter.value;
    currentPage = 1;
    loadRefunds();
  });

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value;
    loadRefunds();
  });

  // Date filter handlers with immediate updates
  dateFromInput?.addEventListener("input", () => {
    dateFrom = dateFromInput.value;
    currentPage = 1;
    loadRefunds();
  });

  dateToInput?.addEventListener("input", () => {
    dateTo = dateToInput.value;
    currentPage = 1;
    loadRefunds();
  });

  // Pagination handlers
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadRefunds();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadRefunds();
      }
    });
  }

  // Modal handlers
  document.addEventListener("click", e => {
    const manageBtn = e.target.closest(".btn--manage");
    if (manageBtn) {
      const { refundId, bookingId, user, amount, requested } =
        manageBtn.dataset;
      openModal({ refundId, bookingId, user, amount, requested });
    }
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (processRefundBtn) {
    processRefundBtn.addEventListener("click", () => {
      const refundId = document.querySelector(".refund-modal").dataset.refundId;
      if (refundId) handleManageRefund("process", refundId);
    });
  }

  if (rejectRefundBtn) {
    rejectRefundBtn.addEventListener("click", () => {
      const refundId = document.querySelector(".refund-modal").dataset.refundId;
      if (refundId) handleManageRefund("reject", refundId);
    });
  }

  // Initialize the refunds table
  loadRefunds();
};

// Combined initialization
export const initRefundManagement = () => {
  // Initialize user-facing functionality on my-tours page
  if (window.location.pathname === "/my-tours") {
    initUserRefundHandlers();
  }

  // Initialize admin management functionality on manage-refunds page
  if (window.location.pathname === "/manage-refunds") {
    initAdminRefundHandlers();
  }
};
