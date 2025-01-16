// js/app.js
import { showAlert } from "./utils/alert";
import { displayMap } from "./utils/mapbox";
import { elements } from "./utils/elements";

// Handler imports
import { initAuthHandlers } from "./handlers/auth";
import { initBookingHandlers } from "./handlers/booking/index";
import { initReviewHandlers } from "./handlers/review";
import { initUserHandlers } from "./handlers/user";
import { initRefundManagement } from "./handlers/refundManagement";
import { initReviewManagement } from "./handlers/reviewManagement";
import { initializeBookingManagement } from "./handlers/bookingManagement";
import { initializeUserManagement } from "./handlers/userManagement";
import { initializeTourManagement } from "./handlers/tourManagement";
import { initializeBillingManagement } from "./handlers/billingManagement";

export class App {
  constructor() {
    this.init();
  }

  init() {
    try {
      const pageConfig = this.getPageConfig();
      this.initializeRequiredFeatures(pageConfig);
    } catch (error) {
      console.error("Application initialization error:", error);
      showAlert("error", "Application initialization failed");
    }
  }

  getPageConfig() {
    const path = window.location.pathname;
    console.log("Current path:", path); // Debug log

    // Define page configurations
    const pageConfigs = {
      // Auth pages
      "/login": {
        handlers: ["auth"],
      },
      "/signup": {
        handlers: ["auth"],
      },
      "/verify-2fa": {
        handlers: ["auth"],
      },
      "/reset-password": {
        handlers: ["auth"],
      },

      // User pages
      "/me": {
        handlers: ["auth", "user"],
      },
      "/my-tours": {
        handlers: ["auth", "booking"],
      },
      "/my-reviews": {
        handlers: ["auth", "review"],
      },

      // Admin pages
      "/manage-users": {
        handlers: ["auth", "userManagement"],
      },
      "/manage-tours": {
        handlers: ["auth", "tourManagement"],
      },
      "/manage-bookings": {
        handlers: ["auth", "bookingManagement"],
      },
      "/manage-reviews": {
        handlers: ["auth", "reviewManagement"],
      },
      "/manage-refunds": {
        handlers: ["auth", "refund"],
      },
      "/billing": {
        handlers: ["auth", "billingManagement"],
      },
    };

    // Get the matching configuration or use default
    let config = pageConfigs[path] || {
      handlers: ["auth"], // Default handlers
    };

    // Special handling for paths
    if (
      // Checkout page
      (path.includes("/tour/") && path.includes("/checkout")) ||
      // Add travelers page
      (path.includes("/booking/") && path.includes("/add-travelers")) ||
      // My tours page
      path === "/my-tours"
    ) {
      config = {
        ...config,
        handlers: [...(config.handlers || []), "booking"],
      };
    }
    // Tour detail page
    else if (path.startsWith("/tour/") && !path.includes("/review")) {
      config = {
        ...config,
        handlers: ["auth"],
        needsMap: true,
      };
    }

    console.log("Page config:", config); // Debug log
    return config;
  }

  initializeRequiredFeatures({ handlers = [], needsMap = false }) {
    console.log("Initializing handlers:", handlers); // Debug log

    // Map handler names to initialization functions
    const handlerMap = {
      auth: initAuthHandlers,
      user: initUserHandlers,
      booking: initBookingHandlers,
      review: initReviewHandlers,
      refund: initRefundManagement,
      reviewManagement: initReviewManagement,
      userManagement: initializeUserManagement,
      bookingManagement: initializeBookingManagement,
      tourManagement: initializeTourManagement,
      billingManagement: initializeBillingManagement,
    };

    // Initialize only required handlers
    handlers.forEach(handlerName => {
      const initFunction = handlerMap[handlerName];
      if (initFunction) {
        try {
          console.log(`Initializing ${handlerName} handler...`);
          initFunction();
        } catch (error) {
          console.error(`${handlerName} handler initialization error:`, error);
        }
      }
    });

    // Initialize map if needed
    if (needsMap) {
      this.initializeMap();
    }

    // Always initialize alerts as they're global
    this.initializeAlerts();
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
