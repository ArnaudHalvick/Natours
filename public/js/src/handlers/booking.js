// handlers/booking.js
import { elements } from "../utils/elements";
import { bookTour, addTravelersToBooking } from "../api/bookingAPI";

export const initBookingHandlers = () => {
  const { form, addTravelersForm, container } = elements.booking;

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

  if (addTravelersForm()) {
    addTravelersForm().addEventListener("submit", e => {
      e.preventDefault();
      const submitBtn = document.querySelector(".add-travelers-submit");
      const bookingId = submitBtn.dataset.bookingId;
      const numParticipants = document.getElementById("numParticipants").value;
      addTravelersToBooking(bookingId, numParticipants);
    });
  }

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
