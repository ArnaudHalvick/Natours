// utils/mapbox.js
export const displayMap = locations => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiYXJuYXVkLWhhbHZpY2siLCJhIjoiY20yamRpeHV3MDQzZTJxb3Y4Y2w5c2Y4byJ9.twUyM4221bznoihxEh2PKA";

  // Initialize the map
  const map = new mapboxgl.Map({
    container: "map", // Container ID
    style: "mapbox://styles/mapbox/streets-v11", // Map style
    scrollZoom: false, // Disable scroll zoom for a better user experience
  });

  // Set bounds to include all tour locations
  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Extend map bounds to include the current location
    bounds.extend(loc.coordinates);

    // Add popup for the location with description
    new mapboxgl.Popup({
      offset: 30, // Offset the popup to prevent overlapping with the marker
      closeOnClick: false, // Prevent popup from closing when clicking on the map
      closeButton: false, // Remove the close button from the popup
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
  });

  // Fit the map to the bounds of the locations
  map.fitBounds(bounds, {
    padding: {
      top: 250,
      bottom: 100,
      left: 100,
      right: 100,
    },
  });

  // Force the page to remain at the top after the map loads
  window.scrollTo(0, 0);
};
