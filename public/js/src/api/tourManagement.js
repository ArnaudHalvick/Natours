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
    return res.data.data;
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
  try {
    console.log("Updating tour with ID:", tourId);

    // Convert locations and startLocation back from string to object if they are strings
    const locations = formData.get("locations");
    const startLocation = formData.get("startLocation");
    const startDates = formData.get("startDates");

    if (locations && typeof locations === "string") {
      formData.delete("locations");
      formData.append("locations", locations); // Keep as string, server will parse it
    }

    if (startLocation && typeof startLocation === "string") {
      formData.delete("startLocation");
      formData.append("startLocation", startLocation); // Keep as string, server will parse it
    }

    if (startDates && typeof startDates === "string") {
      formData.delete("startDates");
      formData.append("startDates", startDates); // Keep as string, server will parse it
    }

    // Log the final form data
    console.log("FormData contents:");
    for (let [key, value] of formData.entries()) {
      console.log(key, ":", value);
    }

    const res = await axios.patch(`/api/v1/tours/${tourId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data.data;
  } catch (error) {
    console.error("Update tour error:", error);
    console.error("Error response:", error.response?.data);
    throw error;
  }
};

export const createTour = async tourData => {
  try {
    console.log("Creating new tour with data:", tourData);

    const formData = new FormData();

    // Handle regular fields from the incoming FormData
    for (let [key, value] of tourData.entries()) {
      formData.append(key, value);
    }

    const res = await axios.post("/api/v1/tours", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("Create response:", res.data);
    return res.data.data;
  } catch (error) {
    console.error("Create tour error:", error);
    console.error("Error response:", error.response?.data);
    throw error;
  }
};

export const deleteTour = async tourId => {
  try {
    console.log("Deleting tour with ID:", tourId);
    const res = await axios.delete(`/api/v1/tours/${tourId}`);
    console.log("Delete response:", res);
    return res;
  } catch (error) {
    console.error("Delete tour error:", error);
    console.error("Error response:", error.response?.data);
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
