"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const tealPin = L.divIcon({
  className: "",
  html: '<div class="map-pin"><span></span></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function PickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(
        Math.round(event.latlng.lat * 1e6) / 1e6,
        Math.round(event.latlng.lng * 1e6) / 1e6,
      );
    },
  });
  return null;
}

function Recenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, map]);
  return null;
}

export default function MapInner({
  center,
  zoom = 13,
  marker,
  interactive = true,
  onPick,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  marker?: { lat: number; lng: number } | null;
  interactive?: boolean;
  onPick?: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
      attributionControl
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {marker && <Marker position={[marker.lat, marker.lng]} icon={tealPin} />}
      {onPick && <PickHandler onPick={onPick} />}
      <Recenter center={center} />
    </MapContainer>
  );
}
