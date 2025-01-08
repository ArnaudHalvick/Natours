// js/app.js
import { elements } from "./utils/elements";
import { initAuthHandlers } from "./handlers/auth";
import { initBookingHandlers } from "./handlers/booking";
import { initReviewHandlers } from "./handlers/review";
import { initRefundHandlers } from "./handlers/refund";
import { initUserHandlers } from "./handlers/user";
import { initReviewManagement } from "./handlers/reviewManagement";
import { initializeBookingManagement } from "./handlers/bookingManagement";
import { showAlert } from "./utils/alert";
import { displayMap } from "./utils/mapbox";

export class App {
  constructor() {
    this.init();
  }

  init() {
    try {
      this.initializeHandlers();
      this.initializeGlobalFeatures();
    } catch (error) {
      console.error("Initialization error:", error);
      showAlert("error", "Application initialization failed");
    }
  }

  initializeHandlers() {
    const handlers = [
      { init: initAuthHandlers, name: "Auth" },
      { init: initBookingHandlers, name: "Booking" },
      { init: initReviewHandlers, name: "Review" },
      { init: initRefundHandlers, name: "Refund" },
      { init: initUserHandlers, name: "User" },
      { init: initReviewManagement, name: "Review Management" },
    ];

    if (document.querySelector(".user-view__bookings-container")) {
      handlers.push({
        init: initializeBookingManagement,
        name: "Booking Management",
      });
    }

    handlers.forEach(({ init, name }) => {
      try {
        init();
      } catch (error) {
        console.error(`${name} handler initialization error:`, error);
      }
    });
  }

  initializeGlobalFeatures() {
    const alertMessage = document.querySelector("body").dataset.alert;
    if (alertMessage) {
      showAlert("success", alertMessage, 15);
    }

    const mapElement = elements.map();
    if (mapElement) {
      try {
        const locations = JSON.parse(mapElement.dataset.locations);
        displayMap(locations);
      } catch (error) {
        console.error("Map initialization error:", error);
        showAlert("error", "Failed to load map");
      }
    }
  }
}
