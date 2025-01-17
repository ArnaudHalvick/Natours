// handlers/booking/MyToursHandler.js
import { requestRefund } from "../../api/bookingAPI";
import { showAlert } from "../../utils/alert";
import { BookingFiltersHandler } from "./BookingFiltersHandler";

class MyToursHandler {
  constructor() {
    // Prevent multiple instances
    if (window.myToursHandler) {
      return window.myToursHandler;
    }
    window.myToursHandler = this;

    this.initializeModals();
    this.bindEvents();
    this.filtersHandler = new BookingFiltersHandler();
    this.isProcessingRefund = false;

    // Create bound event handlers
    this.boundHandleManageClick = this.handleManageClick.bind(this);
    this.boundHandleModalClick = this.handleModalClick.bind(this);
    this.boundHandleCloseModal = this.handleCloseModal.bind(this);
    this.boundHandleRefundModalClick = this.handleRefundModalClick.bind(this);
    this.boundHandleEscapeKey = this.handleEscapeKey.bind(this);
  }

  initializeModals() {
    // Modal elements
    this.managementModal = document.getElementById("managementModal");
    this.refundModal = document.getElementById("refundModal");

    // Management modal elements
    this.manageTourName = document.getElementById("manageTourName");
    this.manageStartDate = document.getElementById("manageStartDate");
    this.managePrice = document.getElementById("managePrice");
    this.manageStatus = document.getElementById("manageStatus");

    // Action buttons
    this.viewTourBtn = document.getElementById("viewTourBtn");
    this.writeReviewBtn = document.getElementById("writeReviewBtn");
    this.editReviewBtn = document.getElementById("editReviewBtn");
    this.addTravelersBtn = document.getElementById("addTravelersBtn");
    this.requestRefundBtn = document.getElementById("requestRefundBtn");
  }

  bindEvents() {
    // Clean up existing event listeners
    document.removeEventListener("click", this.boundHandleManageClick);
    this.managementModal?.removeEventListener(
      "click",
      this.boundHandleModalClick,
    );
    document.removeEventListener("click", this.boundHandleCloseModal);
    this.refundModal?.removeEventListener(
      "click",
      this.boundHandleRefundModalClick,
    );
    document.removeEventListener("keydown", this.boundHandleEscapeKey);

    // Add new event listeners
    document.addEventListener("click", this.boundHandleManageClick);

    if (this.managementModal) {
      this.managementModal.addEventListener(
        "click",
        this.boundHandleModalClick,
      );
    }

    document.addEventListener("click", this.boundHandleCloseModal);

    if (this.refundModal) {
      this.refundModal.addEventListener(
        "click",
        this.boundHandleRefundModalClick,
      );
    }

    document.addEventListener("keydown", this.boundHandleEscapeKey);
  }

  handleManageClick(e) {
    const btn = e.target.closest(".manage-booking-btn");
    if (!btn) return;

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

  handleModalClick(e) {
    const target = e.target;
    if (target.matches("#viewTourBtn")) this.handleViewTour();
    else if (target.matches("#writeReviewBtn")) this.handleWriteReview();
    else if (target.matches("#editReviewBtn")) this.handleEditReview();
    else if (target.matches("#addTravelersBtn")) this.handleAddTravelers();
    else if (target.matches("#requestRefundBtn")) this.handleRequestRefund();
  }

  handleCloseModal(e) {
    if (
      e.target.matches(".close-modal") ||
      e.target === this.managementModal ||
      e.target === this.refundModal
    ) {
      this.closeAllModals();
    }
  }

  handleRefundModalClick(e) {
    if (e.target.matches("#confirmRefund")) {
      e.preventDefault();
      this.confirmRefund();
    } else if (e.target.matches("#cancelRefund")) {
      this.closeAllModals();
    }
  }

  handleEscapeKey(e) {
    if (e.key === "Escape") this.closeAllModals();
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
    if (this.isProcessingRefund) return;

    const confirmBtn = document.getElementById("confirmRefund");
    const cancelBtn = document.getElementById("cancelRefund");

    try {
      this.isProcessingRefund = true;

      // Disable both buttons and update UI
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      confirmBtn.textContent = "Processing...";

      await requestRefund(this.currentBookingId);

      // Close modal after successful refund
      this.closeAllModals();
    } catch (error) {
      console.error("Refund error:", error);
      // Only show error alert if it's not a duplicate request
      if (!error.response?.data?.message?.includes("already been submitted")) {
        showAlert(
          "error",
          error.response?.data?.message || "Error processing refund",
        );
      }
    } finally {
      this.isProcessingRefund = false;

      // Reset button states
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm Refund";
      }
      if (cancelBtn) {
        cancelBtn.disabled = false;
      }
    }
  }
}

// Export singleton instance
export const initMyToursHandler = () => {
  // Return existing instance if available
  if (window.myToursHandler) {
    window.myToursHandler.bindEvents();
    return window.myToursHandler;
  }

  // Create new instance if none exists
  return new MyToursHandler();
};
