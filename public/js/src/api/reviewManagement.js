// api/reviewManagement.js
import axios from "axios";

export const loadReviews = async (page, limit, search, tourId, rating) => {
  const query =
    `/api/v1/reviews/regex?page=${page}&limit=${limit}` +
    (search ? `&search=${encodeURIComponent(search)}` : "") +
    (tourId ? `&tourId=${tourId}` : "") +
    (rating ? `&rating=${rating}` : "");

  const res = await axios.get(query);
  return res.data.data;
};

export const hideReview = async reviewId => {
  return await axios.patch(`/api/v1/reviews/${reviewId}`, { hidden: true });
};

export const deleteReview = async reviewId => {
  return await axios.delete(`/api/v1/reviews/${reviewId}`);
};
