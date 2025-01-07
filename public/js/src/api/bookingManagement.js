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
  const res = await axios.get(`/api/v1/bookings/${bookingId}`);
  return res.data.data.data;
};

export const updateBooking = async (bookingId, data) => {
  const res = await axios({
    method: "PATCH",
    url: `/api/v1/bookings/${bookingId}`,
    data,
  });
  return res.data;
};
