// api/tourManagement.js
import axios from "axios";

export const fetchTours = async (page, limit, search) => {
  let query = `?page=${page}&limit=${limit}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;

  const res = await axios.get(`/api/v1/tours/regex${query}`);
  return res.data.data;
};

export const fetchTourById = async tourId => {
  const res = await axios.get(`/api/v1/tours/${tourId}`);
  return res.data.data;
};

export const updateTour = async (tourId, data) => {
  const formData = new FormData();

  // Append all text fields
  Object.keys(data).forEach(key => {
    if (key !== "images" && key !== "imageCover") {
      formData.append(
        key,
        typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key],
      );
    }
  });

  // Append files if they exist
  if (data.imageCover) formData.append("imageCover", data.imageCover);
  if (data.images) {
    data.images.forEach(image => formData.append("images", image));
  }

  const res = await axios({
    method: "PATCH",
    url: `/api/v1/tours/${tourId}`,
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const createTour = async data => {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    if (key !== "images" && key !== "imageCover") {
      formData.append(
        key,
        typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key],
      );
    }
  });

  if (data.imageCover) formData.append("imageCover", data.imageCover);
  if (data.images) {
    data.images.forEach(image => formData.append("images", image));
  }

  const res = await axios({
    method: "POST",
    url: "/api/v1/tours",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteTour = async tourId => {
  await axios.delete(`/api/v1/tours/${tourId}`);
};

export const toggleTourVisibility = async (tourId, hidden) => {
  const res = await axios({
    method: "PATCH",
    url: `/api/v1/tours/${tourId}`,
    data: { hidden },
  });
  return res.data;
};
