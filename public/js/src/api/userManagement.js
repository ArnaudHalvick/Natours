// api/userManagement.js
import axios from "axios";

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
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async userId => {
  try {
    const res = await axios.delete(`/api/v1/users/${userId}`);
    return res.data;
  } catch (error) {
    throw error;
  }
};
