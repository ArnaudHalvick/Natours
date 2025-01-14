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

    return booking;
  } catch (err) {
    console.error("Error in fetchBookingById:", {
      error: err,
      message: err.message,
      response: err.response?.data,
    });
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