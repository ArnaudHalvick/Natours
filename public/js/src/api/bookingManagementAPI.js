// api/bookingManagementAPI.js
import axios from "axios";

// helper function to validate booking data
export const validateBookingData = data => {
  const errors = {};

  if (!data.tourId) errors.tourId = "Tour is required";
  if (!data.userId) errors.userId = "User ID is required";
  if (!data.startDate) errors.startDate = "Start date is required";
  if (!data.numParticipants || data.numParticipants < 1) {
    errors.numParticipants = "Number of participants must be at least 1";
  }
  if (!data.price || data.price < 0) {
    errors.price = "Price must be a positive number";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const fetchBookings = async (
  page,
  limit,
  filter,
  search,
  dateFrom,
  dateTo,
  tourFilter,
) => {
  let query = `?page=${page}&limit=${limit}`;
  if (filter) query += `&paid=${filter}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  if (dateFrom) query += `&dateFrom=${dateFrom}`;
  if (dateTo) query += `&dateTo=${dateTo}`;
  if (tourFilter) query += `&tour=${tourFilter}`;

  const res = await axios.get(`/api/v1/bookings/regex${query}`);
  return res.data.data;
};

export const fetchBookingById = async bookingId => {
  try {
    const res = await axios.get(`/api/v1/bookings/${bookingId}`);
    const booking = res.data.data.data;

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Build a friendly array of payment info (though you may or may not use this)
    booking.paymentInfo = booking.paymentIntents?.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      formattedAmount: `$${payment.amount.toLocaleString()}`,
    })) || [
      {
        id: booking.paymentIntentId,
        amount: booking.price,
        formattedAmount: `$${booking.price.toLocaleString()}`,
      },
    ];

    return booking;
  } catch (err) {
    console.error("Error in fetchBookingById:", err);
    throw err;
  }
};

export const fetchTourById = async tourId => {
  try {
    const res = await axios.get(`/api/v1/tours/${tourId}`);
    const tour = res.data.data.data;

    // Ensure startDates are properly formatted
    if (tour.startDates) {
      tour.startDates = tour.startDates.map(date => ({
        ...date,
        participants: date.participants || 0,
      }));
    }

    return tour;
  } catch (err) {
    throw err;
  }
};

export const updateTourDates = async (tourId, startDates) => {
  try {
    // Ensure participants count is properly updated for each startDate
    const res = await axios.patch(`/api/v1/tours/${tourId}`, { startDates });
    return res.data.data.data;
  } catch (err) {
    console.error("Error updating tour dates:", err);
    throw err;
  }
};

export const updateBooking = async (bookingId, data) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/bookings/${bookingId}`,
      data,
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const processAdminRefund = async bookingId => {
  try {
    // Create a refund request
    const refund = await axios.post(`/api/v1/refunds/request/${bookingId}`);

    if (refund.data.status !== "success") {
      throw new Error("Failed to create refund request");
    }

    // Process the refund immediately (admin endpoint)
    const result = await axios.patch(
      `/api/v1/refunds/process/${refund.data.data._id}`,
    );
    return result.data;
  } catch (err) {
    throw err;
  }
};

export const createManualBooking = async bookingData => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/bookings/manual",
      data: bookingData,
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};
