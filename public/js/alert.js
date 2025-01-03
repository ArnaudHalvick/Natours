let alertTimeout; // Keep track of the current alert timeout

export const hideAlert = () => {
  const el = document.querySelector(".alert");
  if (el) el.parentElement.removeChild(el);
  clearTimeout(alertTimeout); // Clear the timeout when hiding the alert
};

export const showAlert = (type, msg, time = 5) => {
  hideAlert(); // Hide any existing alert before showing a new one
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  alertTimeout = window.setTimeout(hideAlert, time * 1000); // Set a new timeout
};
