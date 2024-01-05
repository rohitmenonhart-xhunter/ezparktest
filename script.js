// Initialize Leaflet map
function initMap() {
    const map = L.map("map").setView([13.003065, 79.970555], 10);

    // Create a custom marker icon for available slots
    const availableIcon = L.icon({
        iconUrl: 'green-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    // Create a custom marker icon for booked slots
    const bookedIcon = L.icon({
        iconUrl: 'red-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    // Create a custom marker icon for the user's location
    const userLocationIcon = L.icon({
        iconUrl: 'location-marker.png', // Replace with the actual path to your user location marker image
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers = {};
    let currentUserBooking = null;

    // Use the Geolocation API to get the current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Automatically zoom slightly further to the user's location
                map.setView([latitude, longitude], 14);

                // Add a marker for the user's location
                const userMarker = L.marker([latitude, longitude], { icon: userLocationIcon }).addTo(map);
                userMarker.bindPopup('Your Location').openPopup();
            },
            (error) => {
                console.error(error.message);
            }
        );
    } else {
        console.error('Geolocation is not supported by your browser.');
    }

    // Listen for changes in parking locations
    db.ref("parkingLocations").on("value", (snapshot) => {
        mapMarkers(snapshot.val());
    });

    // Function to map parking locations
    function mapMarkers(locations) {
        // Remove existing markers
        for (const storeName in markers) {
            map.removeLayer(markers[storeName]);
        }

        // Add new markers for parking locations
        if (locations) {
            for (const storeName in locations) {
                const { latitude, longitude, bookedBy, bookedUntil } = locations[storeName];
                const isBooked = bookedBy && bookedUntil && bookedUntil > Date.now();

                const icon = isBooked ? bookedIcon : availableIcon;

                markers[storeName] = L.marker([latitude, longitude], { icon }).addTo(map);
                markers[storeName].bindPopup(`Parking at ${storeName}`).openPopup();

                // Attach a click event to each marker
                markers[storeName].on('click', function () {
                    if (!isBooked) {
                        if (!currentUserBooking) {
                            promptBookingConfirmation(storeName);
                        } else {
                            alert("You can only book one slot at a time.");
                        }
                    } else {
                        alert(`This parking slot at ${storeName} is already booked.`);
                    }
                });
            }
        }
    }

    // Function to prompt the user for booking confirmation
    function promptBookingConfirmation(storeName) {
        const confirmBooking = confirm(`Do you want to book the parking slot at ${storeName}?`);

        if (confirmBooking) {
            promptBookingDuration(storeName);
        }
    }

    // Function to prompt the user for booking duration
    function promptBookingDuration(storeName) {
        const durationOptions = ['5 mins', '15 mins', '45 mins', '1 hr', '2 hrs', '4 hrs', '6 hrs'];
        const selectedDuration = prompt(`Select booking duration for ${storeName}:\n${durationOptions.join('\n')}`);

        if (durationOptions.includes(selectedDuration)) {
            // Handle the selected duration, e.g., update the database
            bookParkingSlot(storeName, selectedDuration);
        } else {
            alert('Invalid duration selected. Please try again.');
        }
    }

    // Function to handle booking the parking slot
    function bookParkingSlot(storeName, selectedDuration) {
        const parkingLocationsRef = db.ref('parkingLocations');

        // Calculate the booking end time
        const bookingEndTime = Date.now() + getDurationInMilliseconds(selectedDuration);

        // Push the booking details to the database
        parkingLocationsRef.child(storeName).update({
            bookedBy: "user123", // Replace with the actual user identifier
            bookedUntil: bookingEndTime,
        });

        alert(`Parking slot at ${storeName} booked for ${selectedDuration}.`);

        // Save the current user booking
        currentUserBooking = {
            storeName: storeName,
            bookedUntil: bookingEndTime,
        };

        // Reload the page after 3 minutes
        setTimeout(() => {
            location.reload();
        }, 3 * 60 * 1000);
    }

    // Function to convert selected duration to milliseconds
    function getDurationInMilliseconds(selectedDuration) {
        switch (selectedDuration) {
            case '5 mins':
                return 5 * 60 * 1000;
            case '15 mins':
                return 15 * 60 * 1000;
            case '45 mins':
                return 45 * 60 * 1000;
            case '1 hr':
                return 60 * 60 * 1000;
            case '2 hrs':
                return 2 * 60 * 60 * 1000;
            case '4 hrs':
                return 4 * 60 * 60 * 1000;
            case '6 hrs':
                return 6 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }

    // Add a button to reload the page
    const reloadButton = L.control({ position: 'topright' });
    reloadButton.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'reload-button');
        div.innerHTML = '<button onclick="reloadPage()">check for parking availability</button>';
        return div;
    };
    reloadButton.addTo(map);
}

// Function to reload the page
function reloadPage() {
    location.reload();
}

// Call the initialization function when the page loads
window.onload = initMap;
