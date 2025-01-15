// js/app.js
import { elements } from "./utils/elements";

import { initAuthHandlers } from "./handlers/auth";
import { initBookingHandlers } from "./handlers/booking";
import { initReviewHandlers } from "./handlers/review";
import { initUserHandlers } from "./handlers/user";
import { initRefundManagement } from "./handlers/refundManagement";
import { initReviewManagement } from "./handlers/reviewManagement";
import { initializeBookingManagement } from "./handlers/bookingManagement";
import { initializeUserManagement } from "./handlers/userManagement";
import { initializeTourManagement } from "./handlers/tourManagement";
import { initializeBillingManagement } from "./handlers/billingManagement";

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
      console.error("Application initialization error:", error);
      showAlert("error", "Application initialization failed");
    }
  }

  determinePageType() {
    const path = window.location.pathname;
    const isBookingPage = Boolean(
      document.querySelector("#bookingForm") ||
        document.querySelector(".add-travelers__form"),
    );
    const isManagementPage = Boolean(
      document.querySelector(".user-view__bookings-container"),
    );

    return {
      isBookingPage,
      isManagementPage,
      isBillingPage: path === "/billing",
      isTourManagementPage: path === "/manage-tours",
    };
  }

  initializeHandlers() {
    const pageType = this.determinePageType();

    // Base handlers that are always needed
    const baseHandlers = [
      { init: initAuthHandlers, name: "Auth" },
      { init: initUserHandlers, name: "User" },
    ];

    // Conditional handlers based on page type
    const conditionalHandlers = [
      // Only initialize booking handlers if we're on a booking page
      ...(!pageType.isManagementPage
        ? [{ init: initBookingHandlers, name: "Booking" }]
        : []),

      // Initialize review handlers if not on management pages
      ...(!pageType.isManagementPage
        ? [{ init: initReviewHandlers, name: "Review" }]
        : []),

      // Management handlers for specific pages
      ...(pageType.isManagementPage
        ? [
            { init: initReviewManagement, name: "Review Management" },
            { init: initializeUserManagement, name: "User Management" },
            { init: initRefundManagement, name: "Refund Management" },
            { init: initializeBookingManagement, name: "Booking Management" },
          ]
        : []),

      // Billing management
      ...(pageType.isBillingPage
        ? [{ init: initializeBillingManagement, name: "Billing Management" }]
        : []),

      // Tour management
      ...(pageType.isTourManagementPage
        ? [{ init: initializeTourManagement, name: "Tour Management" }]
        : []),
    ];

    // Combine and initialize all handlers
    const handlers = [...baseHandlers, ...conditionalHandlers];

    handlers.forEach(({ init, name }) => {
      try {
        console.log(`Initializing ${name} handler...`);
        init();
      } catch (error) {
        console.error(`${name} handler initialization error:`, error);
      }
    });
  }

  initializeGlobalFeatures() {
    this.initializeAlerts();
    this.initializeMap();
  }

  initializeAlerts() {
    const alertMessage = document.querySelector("body").dataset.alert;
    if (alertMessage) {
      showAlert("success", alertMessage, 15);
    }
  }

  initializeMap() {
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
