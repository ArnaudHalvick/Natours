// api/bookingManagementAPI.js
import axios from "axios";

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
    return res.data.data.data;
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
