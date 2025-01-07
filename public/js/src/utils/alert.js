// utils/alert.js
let alertTimeout;

export const hideAlert = () => {
  const el = document.querySelector(".alert");
  if (el) el.parentElement.removeChild(el);
  clearTimeout(alertTimeout);
};

export const showAlert = (type, msg, time = 5) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  alertTimeout = window.setTimeout(hideAlert, time * 1000);
};

// utils/pagination.js
export const updatePaginationInfo = (currentPage, totalPages) => {
  document.getElementById("pageInfo").textContent =
    `Page ${currentPage} of ${totalPages}`;
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
};

// utils/dom.js
export const toggleFormFields = (form, isCreating) => {
  const creationFields = form.querySelectorAll(".creation-only");
  const editFields = form.querySelectorAll(".edit-only");

  creationFields.forEach(field => {
    const input = field.querySelector("input, select");
    if (input) {
      input.required = isCreating;
      field.style.display = isCreating ? "block" : "none";
    }
  });

  editFields.forEach(field => {
    field.style.display = isCreating ? "none" : "block";
  });
};
