// Function to load Firebase configuration from app.js
function loadFirebaseConfig() {
    // You need to include app.js before inspection.js in your HTML
    // Assuming that app.js is already loaded, you can directly access the initialized app
    return firebase.app().options;
  }
  
  // Initialize Firebase using the loaded configuration
  const firebaseConfig = loadFirebaseConfig();
  
  // Function to display the user details form
  function showUserDetailsForm() {
    const userDetailsForm = document.getElementById('userDetailsForm');
    userDetailsForm.style.display = 'block';
  
    const submitButton = document.getElementById('submitUserDetails');
    submitButton.addEventListener('click', () => {
      // Retrieve user details from the form
      const userName = document.getElementById('userName').value;
      const userPhoneNumber = document.getElementById('userPhoneNumber').value;
  
      // You can now save the user details to Firebase or perform other actions as needed
  
      // Display the map interface
      initMap();
    });
  }
  
  // Function to initialize Leaflet map
  function initMap() {
    const map = L.map('map').setView([0, 0], 2); // Set the initial view to your desired location and zoom level
  
    // Add a simple tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  
    // Add a marker or perform other map-related actions as needed
    // For example: L.marker([0, 0]).addTo(map);
  }
  
  // Call the function to display the user details form
  document.addEventListener('DOMContentLoaded', showUserDetailsForm);
  