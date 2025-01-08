// handlers/userManagement.js
import { initUserManagement } from "../api/userManagement";

export const initializeUserManagement = () => {
  const container = document.querySelector(".user-view__users-container");
  if (container) {
    initUserManagement();
  }
};
