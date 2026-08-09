import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { IWarehouse } from "../../types/location/IWarehouse";

interface WarehouseMapPickerProps {
    warehouses: IWarehouse[];
    value: string;
    onChange: (ref: string) => void;
    className?: string;
}

const DEFAULT_CENTER: L.LatLngExpression = [48.3794, 31.1656]; // Ukraine, roughly centered
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 15;

const MARKER_COLOR = "#6C2BD9"; // mm-purple
const SELECTED_MARKER_COLOR = "#F27127"; // mm-orange

// Visual pick-a-warehouse map for Nova Poshta delivery (Leaflet + OpenStreetMap tiles — no API
// key required). Plots every warehouse returned for the chosen settlement using the real
// Latitude/Longitude the backend now forwards from the Nova Poshta API (see WarehousDto.cs);
// clicking a pin selects that warehouse the same way picking it from the <Select> dropdown does.
const WarehouseMapPicker: React.FC<WarehouseMapPickerProps> = ({ warehouses, value, onChange, className }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
    // Keep the latest onChange without re-binding marker click handlers on every render.
    // Updated in an effect (not during render) — refs must never be written while rendering.
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Re-plot markers whenever the warehouse list changes (new settlement chosen).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();

        const plottable = warehouses.filter(
            (w): w is IWarehouse & { latitude: number; longitude: number } =>
                typeof w.latitude === "number" && typeof w.longitude === "number"
        );

        plottable.forEach((warehouse) => {
            const marker = L.circleMarker([warehouse.latitude, warehouse.longitude], {
                radius: 9,
                weight: 2,
                color: "#ffffff",
                fillColor: warehouse.ref === value ? SELECTED_MARKER_COLOR : MARKER_COLOR,
                fillOpacity: 0.9,
            })
                .addTo(map)
                .bindPopup(`<strong>${warehouse.description}</strong>${warehouse.phone ? `<br/>${warehouse.phone}` : ""}`)
                .on("click", () => onChangeRef.current(warehouse.ref));
            markersRef.current.set(warehouse.ref, marker);
        });

        if (plottable.length > 0) {
            const bounds = L.latLngBounds(plottable.map((w) => [w.latitude, w.longitude] as [number, number]));
            map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
        } else {
            map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouses]);

    // Re-color + pan/zoom to the selected warehouse whenever `value` changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach((marker, ref) => {
            marker.setStyle({ fillColor: ref === value ? SELECTED_MARKER_COLOR : MARKER_COLOR });
        });

        const selected = value ? markersRef.current.get(value) : undefined;
        if (selected) {
            map.setView(selected.getLatLng(), Math.max(map.getZoom(), SELECTED_ZOOM));
            selected.openPopup();
        }
    }, [value]);

    return (
        <div
            ref={containerRef}
            role="application"
            aria-label="Карта відділень Нової пошти"
            className={className ?? "w-full h-72 rounded-lg overflow-hidden border border-gray-200"}
        />
    );
};

export default WarehouseMapPicker;
