// js/app.js
import { elements } from "./utils/elements";

import { initAuthHandlers } from "./handlers/auth";
import { initBookingHandlers } from "./handlers/booking";
import { initReviewHandlers } from "./handlers/review";
import { initUserHandlers } from "./handlers/user";
import { initRefundManagement } from "./handlers/refundManagement"; // This is correct
import { initReviewManagement } from "./handlers/reviewManagement";
import { initializeBookingManagement } from "./handlers/bookingManagement";
import { initializeUserManagement } from "./handlers/userManagement";
import { initializeTourManagement } from "./handlers/tourManagement";

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
      showAlert("error", "Application initialization failed");
    }
  }

  initializeHandlers() {
    const handlers = [
      { init: initAuthHandlers, name: "Auth" },
      { init: initBookingHandlers, name: "Booking" },
      { init: initReviewHandlers, name: "Review" },
      { init: initUserHandlers, name: "User" },
      { init: initReviewManagement, name: "Review Management" },
      { init: initializeUserManagement, name: "User Management" },
      { init: initRefundManagement, name: "Refund Management" }, // Changed this line
    ];

    // Add booking management if on booking page
    if (document.querySelector(".user-view__bookings-container")) {
      handlers.push({
        init: initializeBookingManagement,
        name: "Booking Management",
      });
    }

    // Add tour management if on tour management page
    if (window.location.pathname === "/manage-tours") {
      handlers.push({
        init: initializeTourManagement,
        name: "Tour Management",
      });
    }

    // Initialize all handlers
    handlers.forEach(({ init, name }) => {
      try {
        init();
      } catch (error) {
        console.error(`${name} handler initialization error:`, error);
      }
    });
  }

  initializeGlobalFeatures() {
    // Handle alerts from body data attribute
    const alertMessage = document.querySelector("body").dataset.alert;
    if (alertMessage) {
      showAlert("success", alertMessage, 15);
    }

    // Initialize map if present
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
