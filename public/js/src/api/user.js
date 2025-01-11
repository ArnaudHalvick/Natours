// api/user.js
import axios from "axios";

export const updateSettings = async (data, type) => {
  try {
    const url =
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateMe";

    const res = await axios({
      method: "PATCH",
      url,
      data,
    });

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const loadUsers = async (page, limit, sort, filter, search) => {
  try {
    let query = `?page=${page}&limit=${limit}&sort=${sort}`;
    if (filter) query += `&role=${filter}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;

    const res = await axios.get(`/api/v1/users${query}`);
    return res.data;
  } catch (error) {
    throw error;
  }
};
