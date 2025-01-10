// utils/locationManager.js
export class LocationManager {
  constructor() {
    this.locations = [];
    this.startLocation = null;
    this.currentSearchResult = null;
    this.geocoder = null;

    this.initializeGeocoder();
    this.setupEventListeners();
  }

  initializeGeocoder() {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYXJuYXVkLWhhbHZpY2siLCJhIjoiY20yamRpeHV3MDQzZTJxb3Y4Y2w5c2Y4byJ9.twUyM4221bznoihxEh2PKA";

    this.geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      types: "country,region,place,postcode,locality,neighborhood,address",
      placeholder: "Search for a location...",
    });

    const searchContainer = document.getElementById("locationSearch");
    if (searchContainer) {
      searchContainer.appendChild(this.geocoder.onAdd());
    }
  }

  setupEventListeners() {
    this.geocoder.on("result", e => {
      this.currentSearchResult = e.result;
      // Show a success message when location is found
      const searchContainer = document.getElementById("locationSearch");
      const existingMessage = searchContainer.querySelector(
        ".location-found-message",
      );
      if (existingMessage) {
        existingMessage.remove();
      }
      const message = document.createElement("div");
      message.className = "location-found-message text-sm text-green-600 mt-2";
      message.textContent = `Location found: ${e.result.place_name}`;
      searchContainer.appendChild(message);
    });

    const addLocationBtn = document.getElementById("addLocationBtn");
    if (addLocationBtn) {
      addLocationBtn.addEventListener("click", () => {
        if (this.currentSearchResult) {
          const location = {
            type: "Point",
            coordinates: this.currentSearchResult.center,
            description: this.currentSearchResult.text,
            address: this.currentSearchResult.place_name,
            day: this.locations.length + 1,
          };

          this.addLocation(location);
          this.currentSearchResult = null;
          this.geocoder.clear();
        }
      });
    }

    const setStartLocationBtn = document.getElementById("setStartLocationBtn");
    if (setStartLocationBtn) {
      setStartLocationBtn.addEventListener("click", () => {
        if (this.currentSearchResult) {
          const location = {
            type: "Point",
            coordinates: this.currentSearchResult.center,
            description: this.currentSearchResult.text,
            address: this.currentSearchResult.place_name,
          };

          this.setStartLocation(location);
          this.currentSearchResult = null;
          this.geocoder.clear();
        }
      });
    }
  }

  addLocation(location) {
    this.locations.push(location);
    this.updateLocationsList();
  }

  setStartLocation(location) {
    this.startLocation = location;
    this.updateStartLocationDisplay();
  }

  updateLocationsList() {
    const container = document.querySelector(".locations-list");
    if (!container) return;

    container.innerHTML = this.locations
      .map(
        (location, index) => `
          <div class="location-item">  
            <div>
              <strong>Day ${location.day}:</strong> ${location.description}. ${location.address}
            </div>
            <button class="btn btn--small btn--red remove-location" data-index="${index}">
              Remove
            </button>
          </div>  
      `,
      )
      .join("");

    container.querySelectorAll(".remove-location").forEach(button => {
      button.addEventListener("click", e => {
        const index = parseInt(e.target.dataset.index);
        this.removeLocation(index);
      });
    });
  }

  updateStartLocationDisplay() {
    const container = document.querySelector(".start-location-display");
    if (!container) return;

    if (this.startLocation) {
      container.innerHTML = `
            <div>
              <strong>Start Location:</strong> ${this.startLocation.description}. ${this.startLocation.address}
            </div>
      `;
    } else {
      container.innerHTML = "<p>No start location set</p>";
    }
  }

  removeLocation(index) {
    this.locations.splice(index, 1);

    // Update day numbers
    this.locations.forEach((location, i) => {
      location.day = i + 1;
    });

    this.updateLocationsList();
  }

  getLocations() {
    return this.locations;
  }

  getStartLocation() {
    return this.startLocation;
  }

  setLocations(locations) {
    this.cleanup();
    locations.forEach(location => {
      const formattedLocation = {
        type: "Point",
        coordinates: location.coordinates,
        description: location.description,
        address: location.address,
        day: location.day,
      };
      this.addLocation(formattedLocation);
    });
  }

  cleanup() {
    this.locations = [];
    this.startLocation = null;
    this.currentSearchResult = null;
    this.updateLocationsList();
    this.updateStartLocationDisplay();
    this.geocoder?.clear();
  }
}
