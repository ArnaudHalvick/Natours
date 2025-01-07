// api/user.js
import axios from "axios";
import { showAlert } from "../utils/alert";

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

    if (res.data.status === "success") {
      showAlert("success", `${type.toUpperCase()} updated successfully!`);
      window.setTimeout(() => location.reload(), 1000);
    }
  } catch (err) {
    const errorMessage =
      err.response?.data?.message ||
      err.response?.data?.errors?.map(el => el.message).join(". ") ||
      "Update failed";
    showAlert("error", errorMessage);
  }
};

export const saveUser = async (userData, isEdit = false) => {
  try {
    const url = isEdit ? `/api/v1/users/${userData.id}` : "/api/v1/users";
    const method = isEdit ? "PATCH" : "POST";
    const data = isEdit
      ? {
          name: userData.name,
          role: userData.role,
          active: userData.active === "true",
        }
      : {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          passwordConfirm: userData.passwordConfirm,
          role: userData.role,
        };

    const res = await axios({ method, url, data });

    if (res.data.status === "success") {
      showAlert(
        "success",
        `User ${isEdit ? "updated" : "created"} successfully!`,
      );
      return res.data.data;
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error saving user");
    throw err;
  }
};

export const deleteUser = async userId => {
  try {
    await axios.delete(`/api/v1/users/${userId}`);
    showAlert("success", "User deleted successfully!");
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error deleting user");
    throw err;
  }
};

export const loadUsers = async (page, limit, sort, filter, search) => {
  try {
    let query = `?page=${page}&limit=${limit}&sort=${sort}`;
    if (filter) query += `&role=${filter}`;
    if (search) query += `&name=${encodeURIComponent(search)}`;

    console.log(`/api/v1/users${query}`);

    const res = await axios.get(`/api/v1/users${query}`);
    return res.data.data;
  } catch (err) {
    showAlert("error", err.response?.data?.message || "Error loading users");
    throw err;
  }
};
