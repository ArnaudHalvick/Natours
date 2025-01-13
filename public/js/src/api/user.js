// api/user.js
import axios from "axios";

export const updateSettings = async (data, type) => {
  try {
    const url =
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateMe";

    // If it's a password update, transform the data to match API expectations
    const requestData =
      type === "password"
        ? {
            currentPassword: data.passwordCurrent,
            password: data.password,
            passwordConfirm: data.passwordConfirm,
          }
        : data;

    const res = await axios({
      method: "PATCH",
      url,
      data: requestData,
    });

    return res.data;
  } catch (error) {
    throw error;
  }
};
