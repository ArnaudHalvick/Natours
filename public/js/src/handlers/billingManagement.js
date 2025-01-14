import { showAlert } from "../utils/alert";
import { fetchTransactions } from "../api/billingAPI";
import { debounce } from "../utils/dom";

let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let dateFrom = "";
let dateTo = "";
let currentPriceRange = "";
const limit = 10;

const updatePaginationButtons = () => {
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
};

const loadTransactions = async () => {
  try {
    const { data, pagination } = await fetchTransactions(
      currentPage,
      limit,
      currentSearch,
      dateFrom,
      dateTo,
      currentPriceRange,
    );
    totalPages = pagination.totalPages;

    const transactionTableBody = document.getElementById(
      "transactionTableBody",
    );
    if (!transactionTableBody) return;

    transactionTableBody.innerHTML = data.length
      ? data
          .map(
            transaction => `
          <tr>
            <td>${transaction._id}</td>
            <td>${transaction.tourInfo.name}</td>
            <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
            <td>${transaction.numParticipants}</td>
            <td>$${transaction.price.toFixed(2)}</td>
            <td>
              <a href="/api/v1/billing/download-invoice/${transaction._id}" 
                 class="btn btn--small btn--green">
                Download Invoice
              </a>
            </td>
          </tr>
        `,
          )
          .join("")
      : '<tr><td colspan="6" style="text-align: center;">No transactions found.</td></tr>';

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    updatePaginationButtons();
  } catch (err) {
    console.error("Error loading transactions:", err);
    showAlert("error", err.message || "Error loading transactions");
  }
};

export const initializeBillingManagement = () => {
  const elements = {
    searchInput: document.getElementById("searchTransaction"),
    dateFromInput: document.getElementById("dateFrom"),
    dateToInput: document.getElementById("dateTo"),
    priceRangeSelect: document.getElementById("priceRange"),
    prevPageBtn: document.getElementById("prevPage"),
    nextPageBtn: document.getElementById("nextPage"),
    transactionTableBody: document.getElementById("transactionTableBody"),
  };

  // Search input handler
  elements.searchInput?.addEventListener(
    "input",
    debounce(e => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadTransactions();
    }, 300),
  );

  // Date range handlers
  elements.dateFromInput?.addEventListener("change", e => {
    dateFrom = e.target.value;
    loadTransactions();
  });

  elements.dateToInput?.addEventListener("change", e => {
    dateTo = e.target.value;
    loadTransactions();
  });

  // Price range handler
  elements.priceRangeSelect?.addEventListener("change", e => {
    currentPriceRange = e.target.value;
    currentPage = 1;
    loadTransactions();
  });

  // Pagination handlers
  elements.prevPageBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadTransactions();
    }
  });

  elements.nextPageBtn?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadTransactions();
    }
  });

  // Initial load
  loadTransactions();
};
