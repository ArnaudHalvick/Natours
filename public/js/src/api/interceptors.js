// api/interceptors.js
import axios from "axios";
import { showAlert } from "../utils/alert";

export const initializeAxiosInterceptors = () => {
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const res = await axios.post("/api/v1/users/refresh-token");
          if (res.data.status === "success") {
            return axios(originalRequest);
          }
        } catch (refreshError) {
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    },
  );
};
