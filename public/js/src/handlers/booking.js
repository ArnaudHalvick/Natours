// handlers/booking.js
import { elements } from "../utils/elements";
import {
  bookTour,
  addTravelersToBooking,
  requestRefund,
} from "../api/bookingAPI";

export const initBookingHandlers = () => {
  const { form, addTravelersForm, container } = elements.booking;
  const managementModal = document.getElementById("managementModal");
  const refundModal = document.getElementById("refundModal");

  // Booking form handler
  if (form()) {
    form().addEventListener("submit", e => {
      e.preventDefault();
      const startDate = document.getElementById("startDate").value;
      const numParticipants = document.getElementById("numParticipants").value;
      const tourId = document.getElementById("bookTour").dataset.tourId;
      e.target.querySelector("#bookTour").textContent = "Processing...";
      bookTour(tourId, startDate, numParticipants);
    });
  }

  // Add travelers form handler
  if (addTravelersForm()) {
    addTravelersForm().addEventListener("submit", e => {
      e.preventDefault();
      const submitBtn = document.querySelector(".add-travelers-submit");
      const bookingId = submitBtn.dataset.bookingId;
      const numParticipants = document.getElementById("numParticipants").value;
      addTravelersToBooking(bookingId, numParticipants);
    });
  }

  // Only initialize modal handlers if the modal exists
  if (managementModal) {
    // Management modal handlers
    document.querySelectorAll(".manage-booking-btn").forEach(btn => {
      btn.addEventListener("click", handleManageClick);
    });

    // Close modal handlers
    document.querySelectorAll(".close-modal").forEach(closeBtn => {
      closeBtn.addEventListener("click", closeAllModals);
    });

    // Modal action handlers
    document
      .getElementById("viewTourBtn")
      ?.addEventListener("click", handleViewTour);
    document
      .getElementById("writeReviewBtn")
      ?.addEventListener("click", handleWriteReview);
    document
      .getElementById("editReviewBtn")
      ?.addEventListener("click", handleEditReview);
    document
      .getElementById("addTravelersBtn")
      ?.addEventListener("click", handleAddTravelers);
    document
      .getElementById("requestRefundBtn")
      ?.addEventListener("click", handleRequestRefund);

    // Refund modal handlers
    document
      .getElementById("confirmRefund")
      ?.addEventListener("click", handleConfirmRefund);
    document
      .getElementById("cancelRefund")
      ?.addEventListener("click", closeAllModals);

    // Close modals when clicking outside
    [managementModal, refundModal].forEach(modal => {
      if (modal) {
        modal.addEventListener("click", e => {
          if (e.target === modal) {
            closeAllModals();
          }
        });
      }
    });

    // Handle escape key
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        closeAllModals();
      }
    });
  }

  // Container click handler for add travelers button
  if (container()) {
    container().addEventListener("click", e => {
      const addTravelersBtn = e.target.closest(".add-travelers-btn");
      if (addTravelersBtn) {
        const bookingId = addTravelersBtn.dataset.bookingId;
        window.location.href = `/booking/${bookingId}/add-travelers`;
      }
    });
  }
};

// Modal handlers
const handleManageClick = e => {
  const btn = e.currentTarget;
  const bookingData = btn.dataset;
  const managementModal = document.getElementById("managementModal");

  // Store data for other operations
  managementModal.dataset.bookingId = bookingData.bookingId;
  managementModal.dataset.tourSlug = bookingData.tourSlug;
  managementModal.dataset.reviewId = bookingData.reviewId;

  // Update modal content
  document.getElementById("manageTourName").textContent =
    `Tour: ${bookingData.tourName}`;
  document.getElementById("manageStartDate").textContent =
    `Start Date: ${new Date(bookingData.startDate).toLocaleDateString()}`;
  document.getElementById("managePrice").textContent =
    `Price: $${parseFloat(bookingData.price).toLocaleString()}`;

  // Update status and available actions
  const hasStarted = bookingData.hasStarted === "true";
  const refundStatus = bookingData.refundStatus;
  const hasReview = bookingData.hasReview === "true";

  // Show/hide action groups based on status
  document.getElementById("reviewActions").style.display = hasStarted
    ? "block"
    : "none";
  document.getElementById("upcomingActions").style.display =
    !hasStarted && !refundStatus ? "block" : "none";

  // Show/hide review buttons
  if (hasStarted) {
    document.getElementById("writeReviewBtn").style.display = hasReview
      ? "none"
      : "block";
    document.getElementById("editReviewBtn").style.display = hasReview
      ? "block"
      : "none";
  }

  // Open management modal
  managementModal.classList.add("show");
};

const closeAllModals = () => {
  const modals = [
    document.getElementById("managementModal"),
    document.getElementById("refundModal"),
  ];

  modals.forEach(modal => {
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
};

const handleViewTour = () => {
  const tourSlug = document.getElementById("managementModal").dataset.tourSlug;
  window.location.href = `/tour/${tourSlug}`;
};

const handleWriteReview = () => {
  const tourSlug = document.getElementById("managementModal").dataset.tourSlug;
  window.location.href = `/tour/${tourSlug}/review`;
};

const handleEditReview = () => {
  const tourSlug = document.getElementById("managementModal").dataset.tourSlug;
  const reviewId = document.getElementById("managementModal").dataset.reviewId;
  window.location.href = `/tour/${tourSlug}/review/${reviewId}/edit`;
};

const handleAddTravelers = () => {
  const bookingId =
    document.getElementById("managementModal").dataset.bookingId;
  window.location.href = `/booking/${bookingId}/add-travelers`;
};

const handleRequestRefund = () => {
  const managementModal = document.getElementById("managementModal");
  const refundModal = document.getElementById("refundModal");

  // Close management modal and open refund modal
  managementModal.classList.remove("show");
  setTimeout(() => {
    managementModal.style.display = "none";
    refundModal.style.display = "flex";

    // Update refund modal content
    document.getElementById("refundTourName").textContent =
      document.getElementById("manageTourName").textContent;
    document.getElementById("refundStartDate").textContent =
      document.getElementById("manageStartDate").textContent;
    document.getElementById("refundAmount").textContent =
      document.getElementById("managePrice").textContent;

    // Show refund modal
    refundModal.classList.add("show");
  }, 300);
};

const handleConfirmRefund = async () => {
  const bookingId =
    document.getElementById("managementModal").dataset.bookingId;
  await requestRefund(bookingId);
  closeAllModals();
};
