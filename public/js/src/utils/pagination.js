// utils/pagination.js
export const updatePaginationInfo = (currentPage, totalPages) => {
  const pageInfo = document.getElementById("pageInfo");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage <= 1;
    prevPageBtn.classList.toggle("btn--disabled", currentPage <= 1);
  }

  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages;
    nextPageBtn.classList.toggle("btn--disabled", currentPage >= totalPages);
  }
};
