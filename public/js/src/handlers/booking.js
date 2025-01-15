// handlers/booking.js
import { elements } from "../utils/elements";
import {
  bookTour,
  addTravelersToBooking,
  requestRefund,
} from "../api/bookingAPI";
import { hideAlert } from "../utils/alert";

class BookingHandler {
  constructor() {
    // Initialize Stripe if the script is loaded
    if (window.Stripe) {
      this.stripe = Stripe(process.env.STRIPE_PUBLIC_KEY);
    }

    // Store elements
    this.init();
    this.initializeEventListeners();
  }

  init() {
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

    // Booking form
    this.bookingForm = document.getElementById("bookingForm");
    this.addTravelersForm = document.querySelector(".add-travelers__form");
  }

  initializeEventListeners() {
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

  handleManageClick(btn) {
    const bookingData = btn.dataset;

    // Store current booking data
    this.currentBookingId = bookingData.bookingId;
    this.currentTourSlug = bookingData.tourSlug;
    this.currentReviewId = bookingData.reviewId;

    // Update modal content
    this.manageTourName.textContent = `Tour: ${bookingData.tourName}`;
    this.manageStartDate.textContent = `Start Date: ${new Date(bookingData.startDate).toLocaleDateString()}`;
    this.managePrice.textContent = `Price: $${parseFloat(bookingData.price).toLocaleString()}`;

    // Get states
    const hasStarted = bookingData.hasStarted === "true";
    const refundStatus = bookingData.refundStatus;
    const hasReview = bookingData.hasReview === "true";
    const isReviewHidden = bookingData.reviewHidden === "true";

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

    if (hasStarted) {
      // If tour has started, show disabled "Can't refund" button
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
      // If there's a refund status, show the badge
      refundBtn.style.display = "none";
      refundBadge.style.display = "inline-block";
      refundBadge.textContent = `Refund ${refundStatus}`;
      refundBadge.className = `btn status-badge--${refundStatus.toLowerCase()}`;
    } else {
      // Show active refund button
      refundBtn.style.display = "inline-block";
      refundBadge.style.display = "none";
      refundBtn.disabled = false;
      refundBtn.className = "btn btn--red";
      refundBtn.innerHTML = '<i class="fas fa-undo"></i> Request Refund';
    }

    // Review buttons logic
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

    // Show modal
    this.managementModal.style.display = "flex";
    this.managementModal.classList.add("show");
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

// Initialize booking handlers
export const initBookingHandlers = () => {
  new BookingHandler();
};
