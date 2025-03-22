"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

const Map = ({ userLocation, nearbyNGOs }) => {
  useEffect(() => {
    // Fix for the marker icon issue in Leaflet with Next.js
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  // Create a custom red marker for user location
  const userIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return <div>Loading map...</div>;
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={[userLocation.latitude, userLocation.longitude]}
        zoom={13}
        style={{ height: "100%", width: "100%", position: "absolute" }}
        className="z-0 rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userIcon}
        >
          <Popup>Your Location</Popup>
        </Marker>

        {/* NGO markers */}
        {nearbyNGOs.map((ngo) => {
          if (
            !ngo.location ||
            !ngo.location.latitude ||
            !ngo.location.longitude
          ) {
            return null;
          }
          return (
            <Marker
              key={ngo.ngo_id}
              position={[ngo.location.latitude, ngo.location.longitude]}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">{ngo.ngoName}</h3>
                  <p className="text-sm">{ngo.distance.toFixed(1)} km away</p>
                  {ngo.description && (
                    <p className="text-sm text-gray-600">{ngo.description}</p>
                  )}
                  <Link
                    href={`/ngo/${ngo.ngo_id}`}
                    className="text-emerald-600 hover:text-emerald-700 text-sm"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
