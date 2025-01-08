// api/bookingManagement.js
import axios from "axios";

export const fetchBookings = async (
  page,
  limit,
  filter,
  search,
  dateFrom,
  dateTo,
) => {
  let query = `?page=${page}&limit=${limit}`;
  if (filter) query += `&paid=${filter}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  if (dateFrom) query += `&dateFrom=${dateFrom}`;
  if (dateTo) query += `&dateTo=${dateTo}`;

  const res = await axios.get(`/api/v1/bookings/regex${query}`);
  return res.data.data;
};

export const fetchBookingById = async bookingId => {
  try {
    console.log("Searching for booking:", bookingId);
    const res = await axios.get(`/api/v1/bookings/regex?search=${bookingId}`);
    console.log("Response from regex endpoint:", res.data);

    const bookings = res.data.data.data;
    console.log("Bookings array:", bookings);

    const booking = bookings.find(b => b._id === bookingId);
    console.log("Found booking:", booking);

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
