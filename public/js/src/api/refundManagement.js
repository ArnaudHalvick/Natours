// api/refundManagement.js
import axios from "axios";
import { showAlert } from "../utils/alert";

// User-facing refund request
export const requestRefund = async bookingId => {
  try {
    const res = await axios({
      method: "POST",
      url: `/api/v1/refunds/request/${bookingId}`,
    });

    if (res.data.status === "success") {
      showAlert("success", "Refund request submitted successfully");
      window.setTimeout(() => location.assign("/my-tours"), 1500);
    }
  } catch (err) {
    showAlert(
      "error",
      err.response?.data?.message || "Error requesting refund",
    );
  }
};

// Admin management functions
export const fetchRefunds = async (
  page,
  limit,
  status,
  sort,
  search,
  dateFrom,
  dateTo,
) => {
  try {
    let query = `?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    if (sort) query += `&sort=${sort}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) query += `&dateFrom=${dateFrom}`;
    if (dateTo) query += `&dateTo=${dateTo}`;

    const res = await axios.get(`/api/v1/refunds${query}`);
    return res.data.data;
  } catch (err) {
    throw err;
  }
};

export const processRefund = async refundId => {
  try {
    const res = await axios.patch(`/api/v1/refunds/process/${refundId}`);
    if (res.data.status === "success") {
      showAlert("success", "Refund processed successfully");
    }
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const rejectRefund = async refundId => {
  try {
    const res = await axios.patch(`/api/v1/refunds/reject/${refundId}`);
    if (res.data.status === "success") {
      showAlert("success", "Refund rejected successfully");
    }
    return res.data;
  } catch (err) {
    throw err;
  }
};
