// handlers/booking/MyToursHandler.js
import { requestRefund } from "../../api/bookingAPI";
import { showAlert } from "../../utils/alert";
import { BookingFiltersHandler } from "./BookingFiltersHandler";

class MyToursHandler {
  constructor() {
    this.initializeModals();
    this.bindEvents();
    // Create the filters handler
    this.filtersHandler = new BookingFiltersHandler();
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
    // Manage booking button clicks
    document.addEventListener("click", e => {
      if (e.target.closest(".manage-booking-btn")) {
        this.handleManageClick(e.target.closest(".manage-booking-btn"));
      }
    });

    // Modal action buttons
    if (this.managementModal) {
      this.managementModal.addEventListener("click", e => {
        const target = e.target;
        if (target.matches("#viewTourBtn")) this.handleViewTour();
        else if (target.matches("#writeReviewBtn")) this.handleWriteReview();
        else if (target.matches("#editReviewBtn")) this.handleEditReview();
        else if (target.matches("#addTravelersBtn")) this.handleAddTravelers();
        else if (target.matches("#requestRefundBtn"))
          this.handleRequestRefund();
      });
    }

    // Modal close buttons
    document.addEventListener("click", e => {
      if (
        e.target.matches(".close-modal") ||
        e.target === this.managementModal ||
        e.target === this.refundModal
      ) {
        this.closeAllModals();
      }
    });

    // Refund modal actions
    if (this.refundModal) {
      this.refundModal.addEventListener("click", e => {
        if (e.target.matches("#confirmRefund")) {
          this.confirmRefund();
        } else if (e.target.matches("#cancelRefund")) {
          this.closeAllModals();
        }
      });
    }

    // Escape key handler
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") this.closeAllModals();
    });
  }

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
}

export const initMyToursHandler = () => new MyToursHandler();
