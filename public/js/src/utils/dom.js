export const toggleFormFields = (form, isCreating) => {
  const creationFields = form.querySelectorAll(".creation-only");
  const editFields = form.querySelectorAll(".edit-only");

  creationFields.forEach(field => {
    const input = field.querySelector("input, select");
    if (input) {
      input.required = isCreating;
      field.classList.toggle("active", isCreating);
    }
  });

  editFields.forEach(field => {
    field.classList.toggle("active", !isCreating);
  });
};

export const updateButtonText = (buttonId, text) => {
  const button = document.getElementById(buttonId);
  if (button) button.textContent = text;
};

export const toggleModal = (modalId, show = true) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.toggle("active", show);
};

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};
