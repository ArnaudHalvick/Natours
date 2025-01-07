// handlers/refund.js
import { elements } from "../utils/elements";
import { requestRefund, handleRefundAction } from "../api/refund";

export const initRefundHandlers = () => {
  const { buttons, modal, manageButtons } = elements.refund;
  let currentRefundId = null;

  if (buttons()) {
    buttons().forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const bookingId = btn.dataset.bookingId;
        requestRefund(bookingId);
      });
    });
  }

  if (modal() && manageButtons()) {
    document.addEventListener("click", e => {
      const manageBtn = e.target.closest(".btn--manage");
      if (manageBtn) {
        e.preventDefault();
        const refundData = {
          refundId: manageBtn.dataset.refundId,
          bookingId: manageBtn.dataset.bookingId,
          user: manageBtn.dataset.user,
          amount: parseFloat(manageBtn.dataset.amount),
          requested: manageBtn.dataset.requested,
        };
        currentRefundId = refundData.refundId;
        openModal(refundData);
      }
    });

    const closeModalBtn = document.getElementById("closeModalBtn");
    const processRefundBtn = document.getElementById("processRefundBtn");
    const rejectRefundBtn = document.getElementById("rejectRefundBtn");

    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (processRefundBtn) {
      processRefundBtn.addEventListener(
        "click",
        () => currentRefundId && handleRefundAction(currentRefundId, "process"),
      );
    }
    if (rejectRefundBtn) {
      rejectRefundBtn.addEventListener(
        "click",
        () => currentRefundId && handleRefundAction(currentRefundId, "reject"),
      );
    }
  }
};

export const openModal = refundData => {
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
