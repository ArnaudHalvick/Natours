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

    const refundTableBody = document.getElementById("refundTableBody");
    if (!refundTableBody) return;

    refundTableBody.innerHTML = data.length
      ? data
          .map(
            refund => `
          <tr class="${refund.status === "pending" ? "refund--pending" : ""}">
            <td class="booking-id">${refund.booking || "N/A"}</td>
            <td class="user-id">${refund.user ? refund.user.name : "Unknown User"}</td>
            <td class="amount">$${(refund.amount / 100).toFixed(2)}</td>
            <td>${new Date(refund.requestedAt).toLocaleDateString()}</td>
            <td>${refund.processedAt ? new Date(refund.processedAt).toLocaleDateString() : "-"}</td>
            <td>
              <span class="status-badge status-badge--${refund.status}">
                ${refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
              </span>
            </td>
            <td class="action-buttons">
              ${
                refund.status === "pending"
                  ? `<button class="btn btn--small btn--manage"
                      data-refund-id="${refund._id}"
                      data-booking-id="${refund.booking}" 
                      data-user="${refund.user ? refund.user.name : "Unknown User"}"
                      data-amount="${refund.amount}"
                      data-requested="${new Date(refund.requestedAt).toLocaleDateString()}">
                      Manage
                    </button>`
                  : ""
              }
            </td>
          </tr>
        `,
          )
          .join("")
      : '<tr><td colspan="7" class="empty-message">No refund requests found.</td></tr>';

    // Update pagination
    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      pageInfo.className = "pagination__numbers";
    }

    updatePaginationButtons();
  } catch (err) {
    console.error("Error loading refunds:", err);
    showAlert("error", err.response?.data?.message || "Error loading refunds");
  }
};

// Update the pagination buttons functionality
const updatePaginationButtons = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage <= 1;
    prevPageBtn.classList.toggle("btn--disabled", currentPage <= 1);
  }

  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages;
    nextPageBtn.classList.toggle("btn--disabled", currentPage >= totalPages);
  }
};

// Update pagination event listeners
const initPagination = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

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
  // Load refunds immediately when the page loads
  loadRefunds();

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

  // Filter handlers
  statusFilter?.addEventListener("change", () => {
    currentStatus = statusFilter.value;
    currentPage = 1;
    loadRefunds();
  });

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value;
    loadRefunds();
  });

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

  // Initialize pagination
  initPagination();

  // Modal handlers
  document.addEventListener("click", e => {
    const manageBtn = e.target.closest(".btn--manage");
    if (manageBtn) {
      const { refundId, bookingId, user, amount, requested } =
        manageBtn.dataset;
      openModal({ refundId, bookingId, user, amount, requested });
    }
  });

  const closeModalBtn = document.getElementById("closeModalBtn");
  const processRefundBtn = document.getElementById("processRefundBtn");
  const rejectRefundBtn = document.getElementById("rejectRefundBtn");

  closeModalBtn?.addEventListener("click", closeModal);

  processRefundBtn?.addEventListener("click", () => {
    const refundId = document.querySelector(".refund-modal").dataset.refundId;
    if (refundId) handleManageRefund("process", refundId);
  });

  rejectRefundBtn?.addEventListener("click", () => {
    const refundId = document.querySelector(".refund-modal").dataset.refundId;
    if (refundId) handleManageRefund("reject", refundId);
  });
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
