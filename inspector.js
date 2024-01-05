const markers = {};
const inspectorMap = L.map("inspector-map");

function initInspectorMap() {
    const parkingIcon = L.icon({
        iconUrl: 'green-marker.png', // Replace with the actual path to your parking marker image
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    const inspectorIcon = L.icon({
        iconUrl: 'location-marker.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(inspectorMap);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                inspectorMap.setView([latitude, longitude], 15);
                const userMarker = L.marker([latitude, longitude], { icon: inspectorIcon }).addTo(inspectorMap);
                userMarker.bindPopup('Your Location').openPopup();
            },
            (error) => {
                console.error(error.message);
            }
        );
    } else {
        console.error('Geolocation is not supported by your browser.');
    }

    const inspectors = {};

    db.ref("inspectorLocations").on("value", (snapshot) => {
        mapInspectors(snapshot.val());
    });

    function mapInspectors(locations) {
        for (const inspectorId in inspectors) {
            inspectorMap.removeLayer(inspectors[inspectorId]);
        }

        if (locations) {
            for (const inspectorId in locations) {
                const { latitude, longitude } = locations[inspectorId];
                inspectors[inspectorId] = L.marker([latitude, longitude], { icon: inspectorIcon }).addTo(inspectorMap);
                inspectors[inspectorId].bindPopup(`Inspector ${inspectorId}`).openPopup();
            }
        }
    }

    let longPressTimer;
    inspectorMap.on('layeradd', function (event) {
        const marker = event.layer;

        marker.on('dblclick', function () {
            const markerId = marker.options.markerId;
            promptRemoveMarker(markerId);
        });
    });

    inspectorMap.on('mousedown', function (event) {
        longPressTimer = setTimeout(() => {
            const confirmAddParking = confirm('Do you want to add this location as a parking spot?');
            if (confirmAddParking) {
                const { lat, lng } = event.latlng;
                markParkingLocation(lat, lng);
            }
        }, 1000);
    });

    inspectorMap.on('mouseup', function () {
        clearTimeout(longPressTimer);
    });

    function locateParking() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    saveParkingLocation(latitude, longitude);
                },
                (error) => {
                    console.error(error.message);
                }
            );
        } else {
            console.error('Geolocation is not supported by your browser.');
        }
    }

    function markParkingLocation(latitude, longitude) {
        const parkingLocationsRef = db.ref('parkingLocations');
        const parkingKey = parkingLocationsRef.push().key;

        parkingLocationsRef.child(parkingKey).set({
            latitude: latitude,
            longitude: longitude,
            available: true,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        alert("Parking spot located successfully!");

        const parkingMarker = L.marker([latitude, longitude], { icon: parkingIcon, markerId: parkingKey }).addTo(inspectorMap);
        parkingMarker.bindPopup('Parking Spot').openPopup();
        markers[parkingKey] = parkingMarker;

        parkingLocationsRef.child(parkingKey).child('available').on('value', (snapshot) => {
            const isAvailable = snapshot.val();
            updateMarkerColor(parkingMarker, isAvailable);
        });
    }

    function updateMarkerColor(marker, isAvailable) {
        if (isAvailable) {
            marker.setIcon(L.icon({ iconUrl: 'green-marker.png', iconSize: [32, 32], iconAnchor: [16, 32] }));
        } else {
            marker.setIcon(L.icon({ iconUrl: 'red-marker.png', iconSize: [32, 32], iconAnchor: [16, 32] }));
        }
    }

    function promptRemoveMarker(markerId) {
        const confirmRemove = confirm(`Do you want to remove this marker with ID ${markerId}?`);

        if (confirmRemove) {
            removeMarker(markerId);
        }
    }

    function removeMarker(markerId) {
        const marker = markers[markerId];

        if (marker) {
            const parkingLocationsRef = db.ref('parkingLocations');

            parkingLocationsRef.child(markerId).remove()
                .then(() => {
                    inspectorMap.removeLayer(marker);
                    delete markers[markerId];
                    alert(`Marker with ID ${markerId} removed successfully!`);
                })
                .catch((error) => {
                    console.error("Error removing marker:", error);
                    alert(`Failed to remove marker with ID ${markerId}. Please try again.`);
                });
        }
    }

    const parkingLocationsRef = db.ref('parkingLocations');
    parkingLocationsRef.on('child_added', (snapshot) => {
        const { latitude, longitude, available } = snapshot.val();
        const parkingMarker = L.marker([latitude, longitude], { icon: parkingIcon, markerId: snapshot.key }).addTo(inspectorMap);
        parkingMarker.bindPopup('Parking Spot').openPopup();
        updateMarkerColor(parkingMarker, available);
        markers[snapshot.key] = parkingMarker;
    });
}

// Assume the existence of saveParkingLocation function
// function saveParkingLocation(latitude, longitude) {
//     // Implement the function to save parking location to the database
// }
