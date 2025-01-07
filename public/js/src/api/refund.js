// api/refund.js
import axios from "axios";
import { showAlert } from "../utils/alert";

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
