// api/interceptors.js
import axios from "axios";
import { showAlert } from "../utils/alert";

export const initializeAxiosInterceptors = () => {
  // Flag to track if we're currently refreshing the token
  let isRefreshing = false;

  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // Don't attempt refresh if:
      // 1. It's not a 401 error
      // 2. It's a login endpoint error
      // 3. It's a refresh token endpoint error
      // 4. Request has already been retried
      if (
        error.response?.status !== 401 ||
        originalRequest.url === "/api/v1/users/login" ||
        originalRequest.url === "/api/v1/users/refresh-token" ||
        originalRequest._retry
      ) {
        return Promise.reject(error);
      }

      // Prevent multiple simultaneous refresh attempts
      if (isRefreshing) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post("/api/v1/users/refresh-token");
        if (res.data.status === "success") {
          isRefreshing = false;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        isRefreshing = false;
        // Only redirect to login if it's actually a token issue
        if (refreshError.response?.status === 401) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }

      return Promise.reject(error);
    },
  );
};
