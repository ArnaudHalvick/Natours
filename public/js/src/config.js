// config.js
export const getStripeKey = () => {
  const bookingForm =
    document.querySelector("#bookingForm") ||
    document.querySelector(".add-travelers__form");
  if (!bookingForm) {
    throw new Error("No booking form found");
  }
  const stripeKey = bookingForm.dataset.stripeKey;
  if (!stripeKey) {
    throw new Error("Stripe key not found");
  }
  return stripeKey;
};
