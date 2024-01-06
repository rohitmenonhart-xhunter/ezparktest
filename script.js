
// Initialize Leaflet map
let currentUserBooking = null;
let latitude = 0; // Initialize with a default value
let longitude = 0;

let clickCount = 0;

function initMap() {
    const map = L.map("map").setView([13.003065, 79.970555], 10);

    


    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latitude = position.coords.latitude; // Update the global variable
                longitude = position.coords.longitude; // Update the global variable

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

    const navigateButton = L.control({ position: 'topleft' });
    navigateButton.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'navigate-button');
        div.innerHTML = '<button onclick="navigateToParkingSlot()">Nav</button>';
        return div;
    };
    navigateButton.addTo(map);

    // Function to handle navigation
    window.navigateToParkingSlot = function () {
        alert('Tap and hold on the map to select a parking slot for navigation.');

        let pressTimer;
        let longPress = false;

        // Listen for mousedown event
        map.on('mousedown', function () {
            pressTimer = setTimeout(function () {
                longPress = true;
            }, 500); // Adjust the duration based on your preference
        });

        // Listen for mouseup event
        map.on('mouseup', function () {
            clearTimeout(pressTimer);
            if (longPress) {
                longPress = false;

                // Get the tapped location
                const destination = map.mouseEventToLatLng(event);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const origin = L.latLng(
                            position.coords.latitude,
                            position.coords.longitude
                        );

                        const control = L.Routing.control({
                            waypoints: [
                                origin,
                                destination,
                            ],
                            routeWhileDragging: true,
                        }).addTo(map);

                        // Close the routing control when the route is calculated
                        map.on('routingstart', () => {
                            if (control._plan) {
                                control._plan.hide();
                            }
                        });
                    },
                    (error) => {
                        console.error(error.message);
                    }
                );
            }
        });
    };


    // Create custom marker icons
    const availableIcon = L.icon({
        iconUrl: 'green-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    const bookedIcon = L.icon({
        iconUrl: 'red-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    const userLocationIcon = L.icon({
        iconUrl: 'location-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers = {};

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
                const { latitude, longitude, bookedBy, bookedUntil, carNumber } = locations[storeName];
                const isBooked = bookedBy && bookedUntil && bookedUntil > Date.now();
                const isBookingExpired = bookedUntil && bookedUntil < Date.now(); // Check if booking has expired

                const icon = isBooked ? (isBookingExpired ? availableIcon : bookedIcon) : availableIcon;

                markers[storeName] = L.marker([latitude, longitude], { icon }).addTo(map);

                // Modify the popup content for booked slots
                let popupContent = `Parking at ${storeName}`;

                if (isBooked) {
                    popupContent = `Parking at ${storeName} is booked by ${bookedBy}.`;

                    if (carNumber) {
                        popupContent += ` Car Number: ${carNumber}`;
                    }

                    if (isBookingExpired) {
                        popupContent += `\nBooking Expired`;
                    }
                }

                markers[storeName].bindPopup(popupContent).openPopup();

                markers[storeName].on('click', function () {
                    if (!isBooked) {
                        if (!currentUserBooking) {
                            // Increment the click count
                            clickCount++;
            
                            if (clickCount % 2 === 1) {
                                // Odd click, redirect to first link
                                window.location.href = 'https://rzp.io/l/hcMfrLSR';
                            } else {if (!isBooked) {
                                if (!currentUserBooking) {
                                    promptBookingConfirmation(storeName);
                                } else {
                                    alert("You can only book one slot at a time.");
                                }
                            };
                            }
                        } else {
                            alert("You can only book one slot at a time.");
                        }
                    } else {
                        alert(`This parking slot at ${storeName} is already booked by ${bookedBy}. Car Number: ${carNumber}`);
                }
                });

                // Attach a click event to each marker
               
                };
            }
        }

        
    }

    // Function to prompt the user for booking confirmation
    function promptBookingConfirmation(storeName) {
        const userName = prompt('Enter your name:');
        if (userName) {
            const confirmBooking = confirm(`Hi ${userName}! Do you want to book the parking slot at ${storeName}?`);
            if (confirmBooking) {
                // Pass the user's name to the next step
                promptCarNumber(storeName, userName);
            }
        } else {
            alert('Name cannot be empty. Please try again.');
        }
    }

    function promptCarNumber(storeName, userName) {
        if (currentUserBooking) {
            alert("You already have a booking. You can only book one slot at a time.");
        } else {
            const carNumber = prompt(`Hi ${userName}! Enter your car number for parking at ${storeName}:`);
            if (carNumber) {
                // Pass both user's name and car number to the next step
                promptBookingDuration(storeName, userName, carNumber);
            } else {
                alert('Car number cannot be empty. Please try again.');
            }
        }
    }

    // Function to prompt the user for booking duration
    function promptBookingDuration(storeName, userName, carNumber) {
        const durationOptions = ['5 mins', '15 mins', '45 mins', '1 hr', '2 hrs', '4 hrs', '6 hrs'];
        const selectedDuration = prompt(`Hi ${userName}! Select booking duration for ${storeName}:\n${durationOptions.join('\n')}`);

        if (durationOptions.includes(selectedDuration)) {
            // Check if the car number is unique before proceeding
            checkCarNumberUniqueness(storeName, userName, carNumber, selectedDuration);
        } else {
            alert('Invalid duration selected. Please try again.');
        }
    }

    // Function to handle booking the parking slot
    function bookParkingSlot(storeName, userName, carNumber, selectedDuration) {
        const parkingLocationsRef = db.ref('parkingLocations');
    
        // Razorpay Payment Button Integration
        const razorpayForm = document.createElement('form');
        razorpayForm.innerHTML = '<script src="https://checkout.razorpay.com/v1/payment-button.js" data-payment_button_id="pl_NL8H11IJh3utBL" async></script>';
        document.body.appendChild(razorpayForm);
    
        // Calculate the booking end time
        const bookingEndTime = Date.now() + getDurationInMilliseconds(selectedDuration);
    
        // Push the booking details to the database, including user's name and car number
        const bookingDetails = {
            bookedBy: userName,
            bookedUntil: bookingEndTime,
            carNumber: carNumber, // Add car number to the booking details
        };
    
        parkingLocationsRef.child(storeName).update(bookingDetails);
    
        alert(`Parking slot at ${storeName} booked for ${selectedDuration}.`);
    
        // Save the current user booking to both the state and the database
        currentUserBooking = {
            storeName: storeName,
            bookedUntil: bookingEndTime,
            carNumber: carNumber, // Add car number to the currentUserBooking object
            // Add the store location to the currentUserBooking object
            storeLocation: {
                latitude: latitude,
                longitude: longitude,
            },
        };
    
        // Update the user's booking in the database
        db.ref('users').child(userName).update({
            currentBooking: currentUserBooking,
        });
    
        // Set a timer to automatically remove the username and car number after the specified duration
        const timerDuration = getDurationInMilliseconds(selectedDuration);
        setTimeout(removeBookingData, timerDuration, storeName, userName, parkingLocationsRef);
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

    // Function to check car number uniqueness before booking
    function checkCarNumberUniqueness(storeName, userName, carNumber, selectedDuration) {
        db.ref('parkingLocations').once('value', (snapshot) => {
            const parkingLocations = snapshot.val();

            // Check if the car number is unique among all bookings
            const isCarNumberUnique = Object.values(parkingLocations)
                .every(location => !location || !location.carNumber || location.carNumber !== carNumber);

            if (isCarNumberUnique) {
                // If car number is unique, proceed with booking
                bookParkingSlot(storeName, userName, carNumber, selectedDuration);
            } else {
                // If car number is not unique, show an alert
                alert('Car number already in use. Please try a different car number.');
            }
        });
    }

    // Function to remove booking data after the booking period is over
    function removeBookingData(storeName, userName, parkingLocationsRef) {
        // Remove booking details from the parking location
        parkingLocationsRef.child(storeName).update({
            bookedBy: null,
            bookedUntil: null,
            carNumber: null,
        });

        // Remove current booking details from the user
        db.ref('users').child(userName).update({
            currentBooking: null,
        });

        // Remove the marker from the map
        map.removeLayer(markers[storeName]);

        // Reset the currentUserBooking state
        currentUserBooking = null;

        alert(`Booking at ${storeName} has ended.`);
    }

    // Function to reload the page
    const reloadButton = L.control({ position: 'topright' });
    reloadButton.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'reload-button');
        div.innerHTML = '<button onclick="reloadPage()">🔄</button>';
        return div;
    };
    reloadButton.addTo(map);


// Function to reload the page
function reloadPage() {
    location.reload();
}

// Call the initialization function when the page loads
window.onload = initMap;

