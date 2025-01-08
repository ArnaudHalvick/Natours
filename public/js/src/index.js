// js/index.js
import { initializeAxiosInterceptors } from "./api/interceptors";
import { App } from "./app";

document.addEventListener("DOMContentLoaded", () => {
  initializeAxiosInterceptors();
  new App();
});
