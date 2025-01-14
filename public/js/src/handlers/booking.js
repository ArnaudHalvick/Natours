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

    // Initialize handlers
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Management modal handlers
    document.querySelectorAll(".manage-booking-btn").forEach(btn => {
      btn.addEventListener("click", e => this.handleManageClick(e));
    });

    // Close modal handlers
    document.querySelectorAll(".close-modal").forEach(closeBtn => {
      closeBtn.addEventListener("click", () => this.closeAllModals());
    });

    // Modal action handlers
    this.viewTourBtn?.addEventListener("click", () => this.handleViewTour());
    this.writeReviewBtn?.addEventListener("click", () =>
      this.handleWriteReview(),
    );
    this.editReviewBtn?.addEventListener("click", () =>
      this.handleEditReview(),
    );
    this.addTravelersBtn?.addEventListener("click", () =>
      this.handleAddTravelers(),
    );
    this.requestRefundBtn?.addEventListener("click", () =>
      this.handleRequestRefund(),
    );

    // Refund modal handlers
    document
      .getElementById("confirmRefund")
      ?.addEventListener("click", () => this.confirmRefund());
    document
      .getElementById("cancelRefund")
      ?.addEventListener("click", () => this.closeAllModals());

    // Close modals when clicking outside
    [this.managementModal, this.refundModal].forEach(modal => {
      if (modal) {
        modal.addEventListener("click", e => {
          if (e.target === modal) {
            this.closeAllModals();
          }
        });
      }
    });

    // Handle escape key
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closeAllModals();
      }
    });
  }

  handleManageClick(e) {
    const btn = e.currentTarget;
    const bookingData = btn.dataset;

    // Store current booking ID for other operations
    this.currentBookingId = bookingData.bookingId;
    this.currentTourSlug = bookingData.tourSlug;
    this.currentReviewId = bookingData.reviewId;

    // Update modal content
    this.manageTourName.textContent = `Tour: ${bookingData.tourName}`;
    this.manageStartDate.textContent = `Start Date: ${new Date(bookingData.startDate).toLocaleDateString()}`;
    this.managePrice.textContent = `Price: $${parseFloat(bookingData.price).toLocaleString()}`;

    // Update status and available actions
    const hasStarted = bookingData.hasStarted === "true";
    const refundStatus = bookingData.refundStatus;
    const hasReview = bookingData.hasReview === "true";

    // Show/hide action groups based on status
    this.viewTourAction.style.display = "block";
    this.reviewActions.style.display = hasStarted ? "block" : "none";
    this.upcomingActions.style.display =
      !hasStarted && !refundStatus ? "block" : "none";

    // Show/hide review buttons
    if (hasStarted) {
      this.writeReviewBtn.style.display = hasReview ? "none" : "block";
      this.editReviewBtn.style.display = hasReview ? "block" : "none";
    }

    // Open management modal with animation
    this.managementModal.style.display = "flex";
    // Trigger reflow
    void this.managementModal.offsetWidth;
    this.managementModal.classList.add("show");
  }

  closeAllModals() {
    [this.managementModal, this.refundModal].forEach(modal => {
      if (modal) {
        modal.classList.remove("show");
        // Wait for transition to complete before hiding
        setTimeout(() => {
          if (!modal.classList.contains("show")) {
            modal.style.display = "none";
          }
        }, 300);
      }
    });
  }

  handleRequestRefund() {
    // Close management modal and open refund modal
    this.managementModal.classList.remove("show");
    setTimeout(() => {
      this.managementModal.style.display = "none";
      this.refundModal.style.display = "flex";
      // Trigger reflow
      void this.refundModal.offsetWidth;
      this.refundModal.classList.add("show");

      // Update refund modal content
      document.getElementById("refundTourName").textContent =
        this.manageTourName.textContent;
      document.getElementById("refundStartDate").textContent =
        this.manageStartDate.textContent;
      document.getElementById("refundAmount").textContent =
        this.managePrice.textContent;
    }, 300);
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
    e.target.querySelector("#bookTour").textContent = "Processing...";
    await bookTour(tourId, startDate, numParticipants);
  }

  async handleAddTravelersSubmit(e) {
    e.preventDefault();
    const submitBtn = document.querySelector(".add-travelers-submit");
    const bookingId = submitBtn.dataset.bookingId;
    const numParticipants = document.getElementById("numParticipants").value;
    await addTravelersToBooking(bookingId, numParticipants);
  }
}

// Initialize booking handlers
export const initBookingHandlers = () => {
  new BookingHandler();
};
