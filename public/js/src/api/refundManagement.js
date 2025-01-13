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
    const params = new URLSearchParams();

    // Add basic pagination params
    params.append("page", page);
    params.append("limit", limit);

    // Add filters only if they have values
    if (status) params.append("status", status);
    if (sort) params.append("sort", sort);
    if (search) params.append("search", search);

    // Add date filters only if they have values
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    const res = await axios.get(`/api/v1/refunds?${params.toString()}`);
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
