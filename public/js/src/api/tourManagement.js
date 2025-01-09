// api/tourManagement.js
import axios from "axios";

export const fetchTours = async (page = 1, limit = 10, search = "") => {
  try {
    const params = new URLSearchParams({
      page,
      limit,
    });

    if (search) params.append("search", search);

    console.log("Fetching tours with params:", params.toString());
    const res = await axios.get(`/api/v1/tours/regex?${params.toString()}`);
    console.log("Tour response:", res.data);
    return res.data.data;
  } catch (error) {
    console.error("Error fetching tours:", error);
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

export const createTour = async tourData => {
  try {
    const formData = new FormData();

    // Handle regular fields
    Object.keys(tourData).forEach(key => {
      if (key !== "images" && key !== "imageCover") {
        if (typeof tourData[key] === "object") {
          formData.append(key, JSON.stringify(tourData[key]));
        } else {
          formData.append(key, tourData[key]);
        }
      }
    });

    // Handle file uploads
    if (tourData.imageCover) {
      formData.append("imageCover", tourData.imageCover);
    }
    if (tourData.images) {
      tourData.images.forEach(image => {
        formData.append("images", image);
      });
    }

    const res = await axios.post("/api/v1/tours", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  } catch (error) {
    throw error;
  }
};

export const updateTour = async (tourId, tourData) => {
  try {
    const formData = new FormData();

    Object.keys(tourData).forEach(key => {
      if (key !== "images" && key !== "imageCover") {
        if (typeof tourData[key] === "object") {
          formData.append(key, JSON.stringify(tourData[key]));
        } else {
          formData.append(key, tourData[key]);
        }
      }
    });

    if (tourData.imageCover) {
      formData.append("imageCover", tourData.imageCover);
    }
    if (tourData.images) {
      tourData.images.forEach(image => {
        formData.append("images", image);
      });
    }

    const res = await axios.patch(`/api/v1/tours/${tourId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  } catch (error) {
    throw error;
  }
};

export const deleteTour = async tourId => {
  try {
    await axios.delete(`/api/v1/tours/${tourId}`);
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
