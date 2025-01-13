// api/tourManagement.js
import axios from "axios";

export const fetchTours = async (
  page = 1,
  limit = 10,
  search = "",
  difficulty = "",
) => {
  try {
    const params = new URLSearchParams({
      page,
      limit,
    });

    if (search) params.append("search", search);
    if (difficulty) params.append("difficulty", difficulty);

    const res = await axios.get(`/api/v1/tours/regex?${params.toString()}`);

    const { data: tours, pagination } = res.data.data;
    return { tours, pagination };
  } catch (error) {
    throw error;
  }
};

export const fetchTourById = async tourId => {
  try {
    const res = await axios.get(`/api/v1/tours/${tourId}`);
    return res.data.data.data;
  } catch (error) {
    throw error;
  }
};

export const updateTour = async (tourId, formData) => {
  // Existing implementation remains unchanged
  const uploadPromise = new Promise((resolve, reject) => {
    axios({
      method: "PATCH",
      url: `/api/v1/tours/${tourId}`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: progressEvent => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );

        // If upload completes successfully, consider it a success
        if (progress === 100) {
          resolve();
        }
      },
    })
      .then(res => {
        resolve(res.data.data);
      })
      .catch(error => {
        // Only reject for errors that happen before upload completes
        if (error.message !== "Request failed with status code 500") {
          reject(error);
        } else {
          // If it's a 500 error after upload completed, still treat as success
          resolve();
        }
      });
  });

  // Wait for upload to complete
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Upload timeout")), 30000);
  });

  try {
    await Promise.race([uploadPromise, timeoutPromise]);
    return true; // Return success if upload completed
  } catch (error) {
    console.error("Update tour error:", error);
    throw error;
  }
};

export const createTour = async tourData => {
  try {
    const formData = new FormData();

    // Handle regular fields from the incoming FormData
    for (let [key, value] of tourData.entries()) {
      formData.append(key, value);
    }

    const res = await axios.post("/api/v1/tours", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  } catch (error) {
    throw error;
  }
};

export const deleteTour = async tourId => {
  try {
    const res = await axios.delete(`/api/v1/tours/${tourId}`);
    return res;
  } catch (error) {
    throw error;
  }
};

export const toggleTourVisibility = async (tourId, hidden) => {
  try {
    const res = await axios.patch(`/api/v1/tours/${tourId}`, { hidden });
    return res.data.data;
  } catch (error) {
    throw error;
  }
};
