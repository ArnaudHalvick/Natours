// api/bookingAPI.js
import { showAlert } from "../utils/alert";

export const bookTour = async (tourId, startDate, numParticipants) => {
  try {
    const res = await fetch("/api/v1/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tourId, startDate, numParticipants }),
    });
    const data = await res.json();

    if (data.status === "success") {
      showAlert("success", "Tour booked successfully!");
      window.setTimeout(() => {
        location.assign("/my-tours");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const addTravelersToBooking = async (bookingId, numParticipants) => {
  try {
    const res = await fetch(`/api/v1/bookings/${bookingId}/add-travelers`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numParticipants }),
    });
    const data = await res.json();

    if (data.status === "success") {
      showAlert("success", "Travelers added successfully!");
      window.setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const requestRefund = async bookingId => {
  try {
    const res = await fetch(`/api/v1/bookings/${bookingId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();

    if (data.status === "success") {
      showAlert("success", "Refund requested successfully!");
      window.setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
