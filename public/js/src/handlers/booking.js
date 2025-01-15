// handlers/booking.js
import {
  bookTour,
  addTravelersToBooking,
  requestRefund,
} from "../api/bookingAPI";
import { hideAlert, showAlert } from "../utils/alert";
import { getStripeKey } from "../config";

class BookingHandler {
  constructor() {
    try {
      // Check which page we're on
      this.isBookingPage = Boolean(
        document.querySelector("#bookingForm") ||
          document.querySelector(".add-travelers__form"),
      );
      this.isManagementPage = Boolean(
        document.querySelector(".user-view__bookings-container"),
      );

      // Only initialize Stripe on booking pages
      if (this.isBookingPage) {
        if (typeof Stripe === "undefined") {
          console.warn("Stripe not loaded");
          return;
        }

        const bookingForm =
          document.querySelector("#bookingForm") ||
          document.querySelector(".add-travelers__form");
        if (bookingForm) {
          this.stripe = Stripe(getStripeKey());
        }
      }

      // Initialize components
      this.init();
      this.initializeEventListeners();
    } catch (error) {
      // Only show error if we're on a booking page
      if (this.isBookingPage) {
        console.error("BookingHandler initialization error:", error);
        showAlert("error", "Failed to initialize booking system");
      }
    }
  }

  init() {
    // Skip initialization if we're on the management page
    if (this.isManagementPage) return;

    // Modal elements
    this.managementModal = document.getElementById("managementModal");
    this.refundModal = document.getElementById("refundModal");

    // Management modal elements
    this.manageTourName = document.getElementById("manageTourName");
    this.manageStartDate = document.getElementById("manageStartDate");
    this.managePrice = document.getElementById("managePrice");
    this.manageStatus = document.getElementById("manageStatus");

    // Action groups
    this.viewTourAction = document.getElementById("viewTourAction");
    this.reviewActions = document.getElementById("reviewActions");
    this.upcomingActions = document.getElementById("upcomingActions");

    // Action buttons
    this.viewTourBtn = document.getElementById("viewTourBtn");
    this.writeReviewBtn = document.getElementById("writeReviewBtn");
    this.editReviewBtn = document.getElementById("editReviewBtn");
    this.addTravelersBtn = document.getElementById("addTravelersBtn");
    this.requestRefundBtn = document.getElementById("requestRefundBtn");

    // Booking forms
    this.bookingForm = document.getElementById("bookingForm");
    this.addTravelersForm = document.querySelector(".add-travelers__form");
  }

  initializeEventListeners() {
    // Skip event listeners if we're on the management page
    if (this.isManagementPage) return;

    // Use event delegation for manage buttons
    document.addEventListener("click", e => {
      const manageBtn = e.target.closest(".manage-booking-btn");
      if (manageBtn) {
        this.handleManageClick(manageBtn);
      }
    });

    // Modal close buttons using event delegation
    document.addEventListener("click", e => {
      if (e.target.matches(".close-modal")) {
        this.closeAllModals();
      }
    });

    // Action buttons using event delegation
    if (this.managementModal) {
      this.managementModal.addEventListener("click", e => {
        const target = e.target;

        if (target.matches("#viewTourBtn")) {
          this.handleViewTour();
        } else if (target.matches("#writeReviewBtn")) {
          this.handleWriteReview();
        } else if (target.matches("#editReviewBtn")) {
          this.handleEditReview();
        } else if (target.matches("#addTravelersBtn")) {
          this.handleAddTravelers();
        } else if (target.matches("#requestRefundBtn")) {
          this.handleRequestRefund();
        }
      });
    }

    // Refund modal handlers using event delegation
    if (this.refundModal) {
      this.refundModal.addEventListener("click", e => {
        if (e.target.matches("#confirmRefund")) {
          this.confirmRefund();
        } else if (e.target.matches("#cancelRefund")) {
          this.closeAllModals();
        }
      });
    }

    // Close modals when clicking outside using event delegation
    document.addEventListener("click", e => {
      if (e.target === this.managementModal || e.target === this.refundModal) {
        this.closeAllModals();
      }
    });

    // Handle escape key
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closeAllModals();
      }
    });

    // Booking form handlers
    if (this.bookingForm) {
      this.bookingForm.addEventListener(
        "submit",
        this.handleBookingSubmit.bind(this),
      );
    }

    if (this.addTravelersForm) {
      this.addTravelersForm.addEventListener(
        "submit",
        this.handleAddTravelersSubmit.bind(this),
      );
      this.initializeAddTravelersValidation();
    }
  }

  // The rest of the methods remain the same as they're only called when needed
  handleManageClick(btn) {
    const bookingData = btn.dataset;

    // Store current booking data
    this.currentBookingId = bookingData.bookingId;
    this.currentTourSlug = bookingData.tourSlug;
    this.currentReviewId = bookingData.reviewId;

    // Update modal content
    this.manageTourName.textContent = `Tour: ${bookingData.tourName}`;
    this.manageStartDate.textContent = `Start Date: ${new Date(
      bookingData.startDate,
    ).toLocaleDateString()}`;
    this.managePrice.textContent = `Price: $${parseFloat(
      bookingData.price,
    ).toLocaleString()}`;
    document.getElementById("managePurchaseDate").textContent =
      `Purchase Date: ${new Date(bookingData.createdAt).toLocaleDateString()}`;
    document.getElementById("manageTravelers").textContent =
      `Travelers: ${bookingData.numParticipants}`;

    // Get states
    const hasStarted = bookingData.hasStarted === "true";
    const refundStatus = bookingData.refundStatus;
    const hasReview = bookingData.hasReview === "true";
    const isReviewHidden = bookingData.reviewHidden === "true";

    this.updateButtonStates(
      hasStarted,
      refundStatus,
      hasReview,
      isReviewHidden,
    );

    // Show modal
    this.managementModal.style.display = "flex";
    this.managementModal.classList.add("show");
  }

  updateButtonStates(hasStarted, refundStatus, hasReview, isReviewHidden) {
    // View Tour button is always enabled
    this.viewTourBtn.disabled = false;

    // Add Travelers button
    this.addTravelersBtn.disabled = hasStarted || refundStatus;
    this.addTravelersBtn.setAttribute(
      "data-tooltip",
      hasStarted
        ? "Cannot add travelers to started tours"
        : refundStatus
          ? "Cannot add travelers to tours with refund requests"
          : "",
    );

    // Refund button logic
    const refundBtn = document.getElementById("requestRefundBtn");
    const refundBadge = document.getElementById("refundStatusBadge");

    this.updateRefundButton(refundBtn, refundBadge, hasStarted, refundStatus);

    // Review buttons logic
    this.updateReviewButtons(hasStarted, hasReview, isReviewHidden);
  }

  updateRefundButton(refundBtn, refundBadge, hasStarted, refundStatus) {
    if (hasStarted) {
      refundBtn.style.display = "inline-block";
      refundBadge.style.display = "none";
      refundBtn.disabled = true;
      refundBtn.textContent = "Can't refund";
      refundBtn.className = "btn status-badge--started";
      refundBtn.setAttribute(
        "data-tooltip",
        "Cannot request refund for started tours",
      );
    } else if (refundStatus) {
      refundBtn.style.display = "none";
      refundBadge.style.display = "inline-block";
      refundBadge.textContent = `Refund ${refundStatus}`;
      refundBadge.className = `btn status-badge--${refundStatus.toLowerCase()}`;
    } else {
      refundBtn.style.display = "inline-block";
      refundBadge.style.display = "none";
      refundBtn.disabled = false;
      refundBtn.className = "btn btn--red";
      refundBtn.innerHTML = '<i class="fas fa-undo"></i> Request Refund';
    }
  }

  updateReviewButtons(hasStarted, hasReview, isReviewHidden) {
    // Write Review button
    this.writeReviewBtn.disabled = !hasStarted || hasReview;
    this.writeReviewBtn.setAttribute(
      "data-tooltip",
      !hasStarted
        ? "Can only review after tour has started"
        : hasReview
          ? "You have already written a review"
          : "",
    );

    // Edit Review button
    this.editReviewBtn.disabled = !hasStarted || !hasReview || isReviewHidden;
    this.editReviewBtn.setAttribute(
      "data-tooltip",
      !hasStarted
        ? "Tour has not started yet"
        : !hasReview
          ? "No review to edit"
          : isReviewHidden
            ? "Review has been hidden by admin"
            : "",
    );
  }

  closeAllModals() {
    [this.managementModal, this.refundModal].forEach(modal => {
      if (modal) {
        modal.classList.remove("show");
        modal.style.display = "none";
      }
    });
  }

  handleViewTour() {
    window.location.href = `/tour/${this.currentTourSlug}`;
  }

  handleWriteReview() {
    window.location.href = `/tour/${this.currentTourSlug}/review`;
  }

  handleEditReview() {
    window.location.href = `/tour/${this.currentTourSlug}/review/${this.currentReviewId}/edit`;
  }

  handleAddTravelers() {
    window.location.href = `/booking/${this.currentBookingId}/add-travelers`;
  }

  handleRequestRefund() {
    // Close management modal and open refund modal
    this.managementModal.classList.remove("show");
    this.managementModal.style.display = "none";

    // Update refund modal content and show it
    document.getElementById("refundTourName").textContent =
      this.manageTourName.textContent;
    document.getElementById("refundStartDate").textContent =
      this.manageStartDate.textContent;
    document.getElementById("refundAmount").textContent =
      this.managePrice.textContent;

    this.refundModal.style.display = "flex";
    this.refundModal.classList.add("show");
  }

  async confirmRefund() {
    await requestRefund(this.currentBookingId);
    this.closeAllModals();
  }

  async handleBookingSubmit(e) {
    e.preventDefault();
    const startDate = document.getElementById("startDate").value;
    const numParticipants = document.getElementById("numParticipants").value;
    const tourId = document.getElementById("bookTour").dataset.tourId;

    document.querySelector("#bookTour").textContent = "Processing...";
    await bookTour(tourId, startDate, numParticipants);
  }

  initializeAddTravelersValidation() {
    const numParticipantsInput = document.getElementById("numParticipants");
    if (numParticipantsInput) {
      numParticipantsInput.addEventListener("input", e => {
        const availableSpots = parseInt(
          document.getElementById("availableSpots").value,
        );
        const requestedSpots = parseInt(e.target.value);

        if (requestedSpots > availableSpots) {
          e.target.setCustomValidity(
            `Maximum ${availableSpots} additional participants allowed`,
          );
        } else {
          e.target.setCustomValidity("");
        }
      });
    }
  }

  async handleAddTravelersSubmit(e) {
    e.preventDefault();
    const submitBtn = document.querySelector(".add-travelers-submit");
    const bookingId = submitBtn.dataset.bookingId;
    const numParticipants = document.getElementById("numParticipants").value;

    const availableSpots = parseInt(
      document.getElementById("availableSpots").value,
    );
    const requestedSpots = parseInt(numParticipants);

    if (requestedSpots > availableSpots) {
      hideAlert();
      showAlert("error", `Only ${availableSpots} spots available`);
      return;
    }

    await addTravelersToBooking(bookingId, numParticipants);
  }
}

// Add this to your handlers/booking.js file

class BookingFiltersHandler {
  constructor() {
    this.tourFilter = document.getElementById("tourFilter");
    this.sortBy = document.getElementById("sortBy");
    this.bookingTableBody = document.getElementById("bookingTableBody");
    this.originalRows = Array.from(
      this.bookingTableBody.querySelectorAll("tr"),
    );

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    if (this.tourFilter) {
      this.tourFilter.addEventListener("change", () => this.applyFilters());
    }
    if (this.sortBy) {
      this.sortBy.addEventListener("change", () => this.applyFilters());
    }
  }

  applyFilters() {
    let filteredRows = [...this.originalRows];

    // Apply tour filter
    const selectedTour = this.tourFilter.value;
    if (selectedTour) {
      filteredRows = filteredRows.filter(row => {
        const tourName = row.querySelector(".tour-name")?.textContent;
        return tourName === selectedTour;
      });
    }

    // Apply sorting
    const [sortField, sortDirection] = this.sortBy.value.split("-");
    filteredRows.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "createdAt":
          aValue = new Date(a.querySelector(".td-purchase")?.textContent);
          bValue = new Date(b.querySelector(".td-purchase")?.textContent);
          break;
        case "price":
          aValue = parseFloat(
            a
              .querySelector(".td-price")
              ?.textContent.replace("$", "")
              .replace(",", ""),
          );
          bValue = parseFloat(
            b
              .querySelector(".td-price")
              ?.textContent.replace("$", "")
              .replace(",", ""),
          );
          break;
        case "startDate":
          aValue = new Date(a.querySelector(".td-start")?.textContent);
          bValue = new Date(b.querySelector(".td-start")?.textContent);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      const compareResult = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? compareResult : -compareResult;
    });

    // Update the table
    this.bookingTableBody.innerHTML = "";
    if (filteredRows.length > 0) {
      filteredRows.forEach(row =>
        this.bookingTableBody.appendChild(row.cloneNode(true)),
      );
    } else {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "empty-row";
      emptyRow.innerHTML = `
        <td colspan="7">
          <div class="empty-message">
            <i class="fas fa-calendar-times"></i>
            <p>No bookings found</p>
          </div>
        </td>
      `;
      this.bookingTableBody.appendChild(emptyRow);
    }
  }
}

// Modify the initBookingHandlers function to include the filters handler
export const initBookingHandlers = () => {
  // Initialize booking handlers only on the my-tours page
  if (window.location.pathname === "/my-tours") {
    try {
      new BookingHandler();
      new BookingFiltersHandler(); // Add this line
    } catch (error) {
      console.error("Failed to initialize booking handlers:", error);
      showAlert("error", "Failed to initialize booking system");
    }
  }
};
