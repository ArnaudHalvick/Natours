// handlers/booking/index.js
import { initCheckoutHandler } from "./CheckoutHandler";
import { initAddTravelersHandler } from "./AddTravelersHandler";
import { initMyToursHandler } from "./MyToursHandler";

// Re-export the handlers
export { initCheckoutHandler, initAddTravelersHandler, initMyToursHandler };

// Main initialization function
export const initBookingHandlers = () => {
  const path = window.location.pathname;

  try {
    if (path.includes("/tour/") && path.includes("/checkout")) {
      initCheckoutHandler();
    } else if (path.includes("/booking/") && path.includes("/add-travelers")) {
      initAddTravelersHandler();
    } else if (path === "/my-tours") {
      initMyToursHandler();
    }
  } catch (error) {
    console.error("Failed to initialize booking handlers:", error);
    showAlert("error", "Failed to initialize booking system");
  }
};
