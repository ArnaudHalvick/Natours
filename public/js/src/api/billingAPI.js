import axios from "axios";

export const fetchTransactions = async (
  page,
  limit,
  search = "",
  dateFrom = "",
  dateTo = "",
  priceRange = "",
) => {
  try {
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(search && { search }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(priceRange && { priceRange }),
    });

    const res = await axios.get(`/api/v1/billing/transactions?${queryParams}`);

    return res.data.data;
  } catch (err) {
    throw err.response?.data?.message || "Could not fetch transactions";
  }
};
