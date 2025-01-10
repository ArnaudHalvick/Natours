// utils/locationManager.js
export class LocationManager {
  constructor() {
    this.map = null;
    this.geocoder = null;
    this.markers = [];
    this.locations = [];
    this.startLocation = null;
    this.startLocationMarker = null;
    this.bounds = null;
    this.currentSearchMarker = null;
    this.currentSearchResult = null;

    this.initializeMap();
    this.initializeGeocoder();
    this.setupEventListeners();
  }

  initializeMap() {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYXJuYXVkLWhhbHZpY2siLCJhIjoiY20yamRpeHV3MDQzZTJxb3Y4Y2w5c2Y4byJ9.twUyM4221bznoihxEh2PKA";

    this.map = new mapboxgl.Map({
      container: "map-container",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-96, 37.8],
      zoom: 3,
    });

    this.bounds = new mapboxgl.LngLatBounds();
  }

  initializeGeocoder() {
    this.geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false,
      placeholder: "Search for a location...",
    });

    const searchContainer = document.getElementById("locationSearch");
    if (searchContainer) {
      searchContainer.appendChild(this.geocoder.onAdd(this.map));
    }
  }

  setupEventListeners() {
    this.geocoder.on("result", e => {
      console.log("Search result:", e.result);

      if (this.currentSearchMarker) {
        this.currentSearchMarker.remove();
      }

      this.currentSearchMarker = new mapboxgl.Marker({ color: "#FFD700" })
        .setLngLat(e.result.center)
        .addTo(this.map);

      this.currentSearchResult = e.result;

      this.map.flyTo({
        center: e.result.center,
        zoom: 13,
      });
    });

    const addLocationBtn = document.getElementById("addLocationBtn");
    if (addLocationBtn) {
      addLocationBtn.addEventListener("click", () => {
        console.log("Add location clicked");
        if (this.currentSearchResult) {
          const location = {
            type: { type: "Point" },
            coordinates: this.currentSearchResult.center,
            description: this.currentSearchResult.text,
            address: this.currentSearchResult.place_name,
            day: this.locations.length + 1,
          };

          this.addLocation(location);

          if (this.currentSearchMarker) {
            this.currentSearchMarker.remove();
            this.currentSearchMarker = null;
          }
          this.currentSearchResult = null;
          this.geocoder.clear();
        }
      });
    }

    const setStartLocationBtn = document.getElementById("setStartLocationBtn");
    if (setStartLocationBtn) {
      setStartLocationBtn.addEventListener("click", () => {
        console.log("Set start location clicked");
        if (this.currentSearchResult) {
          const location = {
            type: { type: "Point" },
            coordinates: this.currentSearchResult.center,
            description: this.currentSearchResult.text,
            address: this.currentSearchResult.place_name,
          };

          this.setStartLocation(location);

          if (this.currentSearchMarker) {
            this.currentSearchMarker.remove();
            this.currentSearchMarker = null;
          }
          this.currentSearchResult = null;
          this.geocoder.clear();
        }
      });
    }
  }

  addLocation(location) {
    this.locations.push(location);

    // Add marker
    const marker = new mapboxgl.Marker({ color: "#FF0000" })
      .setLngLat(location.coordinates)
      .addTo(this.map);

    // Add popup
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <strong>Day ${location.day}</strong><br>
        ${location.description}
      `);

    marker.setPopup(popup);
    this.markers.push(marker);

    // Update bounds
    this.bounds.extend(location.coordinates);
    this.map.fitBounds(this.bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Update locations list
    this.updateLocationsList();
  }

  setStartLocation(location) {
    console.log("Setting start location:", location);

    this.startLocation = location;

    if (this.startLocationMarker) {
      this.startLocationMarker.remove();
    }

    this.startLocationMarker = new mapboxgl.Marker({ color: "#00FF00" })
      .setLngLat(location.coordinates)
      .addTo(this.map);

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <strong>Start Location</strong><br>
        ${location.description}
      `);

    this.startLocationMarker.setPopup(popup);

    this.bounds.extend(location.coordinates);
    this.map.fitBounds(this.bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    this.updateStartLocationDisplay();
  }

  updateLocationsList() {
    const container = document.querySelector(".locations-list");
    if (!container) return;

    container.innerHTML = this.locations
      .map(
        (location, index) => `
        <div class="location-item p-4 bg-gray-100 rounded mb-2">
          <div class="flex justify-between items-center">
            <div>
              <strong>Day ${location.day}:</strong> ${location.description}
              <div class="text-sm text-gray-600">${location.address}</div>
            </div>
            <button class="btn btn--small btn--red remove-location" data-index="${index}">
              Remove
            </button>
          </div>
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
    console.log("Updating start location display");
    const container = document.querySelector(".start-location-display");
    if (!container) return;

    if (this.startLocation) {
      container.innerHTML = `
        <div class="p-4 bg-gray-100 rounded mb-2">
          <div class="flex justify-between items-center">
            <div>
              <strong>Start Location:</strong> ${this.startLocation.description}
              <div class="text-sm text-gray-600">${this.startLocation.address}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = "<p>No start location set</p>";
    }
  }

  removeLocation(index) {
    this.markers[index].remove();
    this.markers.splice(index, 1);
    this.locations.splice(index, 1);

    // Update day numbers
    this.locations.forEach((location, i) => {
      location.day = i + 1;
    });

    this.recalculateBounds();
    this.updateLocationsList();
  }

  recalculateBounds() {
    this.bounds = new mapboxgl.LngLatBounds();

    if (this.startLocation) {
      this.bounds.extend(this.startLocation.coordinates);
    }

    this.locations.forEach(location => {
      this.bounds.extend(location.coordinates);
    });

    if (!this.bounds.isEmpty()) {
      this.map.fitBounds(this.bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
      });
    }
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
      // Ensure location has the correct structure
      const formattedLocation = {
        type: { type: "Point" },
        coordinates: location.coordinates,
        description: location.description,
        address: location.address,
        day: location.day,
      };
      this.addLocation(formattedLocation);
    });
  }

  cleanup() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    this.startLocationMarker?.remove();
    this.startLocationMarker = null;
    this.currentSearchMarker?.remove();
    this.currentSearchMarker = null;
    this.locations = [];
    this.startLocation = null;
    this.bounds = new mapboxgl.LngLatBounds();
    this.updateLocationsList();
    this.updateStartLocationDisplay();
    this.geocoder?.clear();
  }
}
