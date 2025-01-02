// refund.js
import axios from "axios";
import { showAlert } from "./alert";

export const openModal = refundData => {
  console.log("Opening modal with data:", refundData);
  const modal = document.querySelector(".refund-modal");
  document.getElementById("modalBookingId").textContent = refundData.bookingId;
  document.getElementById("modalUser").textContent = refundData.user;
  document.getElementById("modalAmount").textContent =
    `$${refundData.amount.toFixed(2)}`;
  document.getElementById("modalRequestDate").textContent =
    refundData.requested;
  modal.classList.remove("hidden");
};

export const closeModal = () => {
  const modal = document.querySelector(".refund-modal");
  modal.classList.add("hidden");
};

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
      closeModal();
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

  currentUrl.searchParams.set("status", statusValue);
  currentUrl.searchParams.set("sort", sortValue);

  if (!statusValue) currentUrl.searchParams.delete("status");
  if (!sortValue) currentUrl.searchParams.delete("sort");

  currentUrl.searchParams.delete("page");
  window.location.href = currentUrl.toString();
};

export const handlePagination = page => {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("page", page);
  location.assign(currentUrl.toString());
};
