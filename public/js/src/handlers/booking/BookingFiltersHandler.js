// handlers/booking/BookingFiltersHandler.js
export class BookingFiltersHandler {
  constructor() {
    this.tourFilter = document.getElementById("tourFilter");
    this.sortBy = document.getElementById("sortBy");
    this.bookingTableBody = document.getElementById("bookingTableBody");
    this.originalRows = Array.from(
      this.bookingTableBody.querySelectorAll("tr"),
    );

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    if (this.tourFilter) {
      this.tourFilter.addEventListener("change", () => this.applyFilters());
    }
    if (this.sortBy) {
      this.sortBy.addEventListener("change", () => this.applyFilters());
    }
  }

  applyFilters() {
    let filteredRows = [...this.originalRows];

    // Apply tour filter
    const selectedTour = this.tourFilter.value;
    if (selectedTour) {
      filteredRows = filteredRows.filter(row => {
        const tourName = row.querySelector(".tour-name")?.textContent;
        return tourName === selectedTour;
      });
    }

    // Apply sorting
    const [sortField, sortDirection] = this.sortBy.value.split("-");
    filteredRows.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "createdAt":
          aValue = new Date(a.querySelector(".td-purchase")?.textContent);
          bValue = new Date(b.querySelector(".td-purchase")?.textContent);
          break;
        case "price":
          // Get total price from data attribute for proper sorting with multiple payments
          aValue = parseFloat(
            a.querySelector(".td-price")?.dataset?.totalPrice ||
              a
                .querySelector(".td-price")
                ?.textContent.replace(/[^0-9.-]+/g, ""),
          );
          bValue = parseFloat(
            b.querySelector(".td-price")?.dataset?.totalPrice ||
              b
                .querySelector(".td-price")
                ?.textContent.replace(/[^0-9.-]+/g, ""),
          );
          break;
        case "startDate":
          aValue = new Date(a.querySelector(".td-start")?.textContent);
          bValue = new Date(b.querySelector(".td-start")?.textContent);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      // Handle cases where parsing failed
      if (isNaN(aValue)) aValue = 0;
      if (isNaN(bValue)) bValue = 0;

      const compareResult = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? compareResult : -compareResult;
    });

    // Update the table
    this.bookingTableBody.innerHTML = "";
    if (filteredRows.length > 0) {
      filteredRows.forEach(row =>
        this.bookingTableBody.appendChild(row.cloneNode(true)),
      );
    } else {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "empty-row";
      emptyRow.innerHTML = `
       <td colspan="7">
         <div class="empty-message">
           <i class="fas fa-calendar-times"></i>
           <p>No bookings found</p>
         </div>
       </td>
     `;
      this.bookingTableBody.appendChild(emptyRow);
    }
  }
}
