// refund.js
import axios from "axios";
import { showAlert } from "./alert";

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

export const handleRefundAction = async (refundId, action) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/refunds/${action}/${refundId}`,
    });

    if (res.data.status === "success") {
      showAlert("success", `Refund ${action}ed successfully`);
      window.setTimeout(() => location.reload(), 1500);
    }
  } catch (err) {
    showAlert("error", "Error performing refund action");
  }
};

export const handleFilterChange = () => {
  const statusValue = document.getElementById("status").value;
  const sortValue = document.getElementById("sort").value;
  const currentUrl = new URL(window.location.href);

  // Always set the parameters regardless of value
  currentUrl.searchParams.set("status", statusValue);
  currentUrl.searchParams.set("sort", sortValue);

  // Remove empty parameters
  if (!statusValue) currentUrl.searchParams.delete("status");
  if (!sortValue) currentUrl.searchParams.delete("sort");

  // Reset to page 1 when filters change
  currentUrl.searchParams.delete("page");

  // Always navigate, even if to remove parameters
  window.location.href = currentUrl.toString();
};

export const handlePagination = page => {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("page", page);
  location.assign(currentUrl.toString());
};
