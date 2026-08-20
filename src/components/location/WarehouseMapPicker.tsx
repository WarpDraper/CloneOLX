import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import type { IWarehouse } from "../../types/location/IWarehouse";
import { branchLabel, todaysHours } from "../../utils/warehouseLabel";

interface WarehouseMapPickerProps {
    warehouses: IWarehouse[];
    value: string;
    onChange: (ref: string) => void;
    className?: string;
}

type GeoWarehouse = IWarehouse & { latitude: number; longitude: number };

const hasCoords = (w: IWarehouse): w is GeoWarehouse =>
    typeof w.latitude === "number" && typeof w.longitude === "number";

const DEFAULT_CENTER: L.LatLngExpression = [48.3794, 31.1656]; // Ukraine, roughly centered
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 15;

const MARKER_COLOR = "#DA291C"; // Nova Poshta brand red
const SELECTED_MARKER_COLOR = "#F27127"; // mm-orange — visually distinct "selected" highlight

// Below this zoom, overlapping pins collapse into a numbered cluster bubble instead of drawing
// every warehouse on top of itself (a big city can return several hundred). At/above it every
// warehouse always gets its own pin, plus a small branch-number badge, so a click always resolves
// to exactly one branch.
const CLUSTER_ZOOM_THRESHOLD = 14;
// Screen-space (not geographic) grid used to group nearby pins into a cluster — pixels stay a
// constant visual size regardless of zoom, unlike a fixed lat/lng grid would.
const CLUSTER_CELL_PX = 56;

// Small subtle dots zoomed out to city level, growing into clearly-clickable pins once the user
// has zoomed into a specific street/neighbourhood.
const radiusForZoom = (zoom: number) => (zoom <= 8 ? 4 : zoom <= 11 ? 6 : zoom <= 13 ? 8 : 10);

let popupStylesInjected = false;
// Leaflet's default tooltip chrome (background/border/arrow) doesn't match the little red
// branch-number badge or borderless cluster-count label we want — injected once, globally, since
// this component can mount more than once on the same page load (profile tab + checkout).
const ensurePopupStyles = () => {
    if (popupStylesInjected || typeof document === "undefined") return;
    if (document.getElementById("np-warehouse-marker-styles")) {
        popupStylesInjected = true;
        return;
    }
    const style = document.createElement("style");
    style.id = "np-warehouse-marker-styles";
    style.textContent = `
        .leaflet-tooltip.np-marker-number {
            background: ${MARKER_COLOR};
            color: #fff;
            border: none;
            border-radius: 9999px;
            padding: 1px 6px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 1px 2px rgba(0,0,0,0.25);
        }
        .leaflet-tooltip.np-marker-number::before { display: none; }
        .leaflet-tooltip.np-cluster-count {
            background: transparent;
            border: none;
            box-shadow: none;
            color: #fff;
            font-weight: 700;
            font-size: 12px;
            pointer-events: none;
        }
        .leaflet-tooltip.np-cluster-count::before { display: none; }
    `;
    document.head.appendChild(style);
    popupStylesInjected = true;
};

// Builds the popup DOM (not an HTML string) so the "Обрати це відділення" button can carry a real
// click handler instead of relying on string-templated onclick attributes.
const buildPopupContent = (
    warehouse: GeoWarehouse,
    isSelected: boolean,
    t: (key: string) => string,
    onSelect: () => void
): HTMLElement => {
    const root = L.DomUtil.create("div", "np-warehouse-popup");
    root.style.minWidth = "220px";

    const title = L.DomUtil.create("div", "", root);
    title.style.fontWeight = "700";
    title.style.color = "#002f34";
    title.style.marginBottom = "2px";
    title.textContent = branchLabel(warehouse, t);

    const address = L.DomUtil.create("div", "", root);
    address.style.fontSize = "13px";
    address.style.color = "#374151";
    address.style.marginBottom = "4px";
    address.textContent = warehouse.description;

    if (warehouse.phone) {
        const phone = L.DomUtil.create("div", "", root);
        phone.style.fontSize = "12px";
        phone.style.color = "#6b7280";
        phone.textContent = warehouse.phone;
    }

    const hours = todaysHours(warehouse.schedule);
    if (hours) {
        const schedule = L.DomUtil.create("div", "", root);
        schedule.style.fontSize = "12px";
        schedule.style.color = "#6b7280";
        schedule.style.marginTop = "2px";
        schedule.textContent = `${t("warehouseMapPicker.schedulePrefix")} ${hours}`;
    }

    const button = L.DomUtil.create("button", "np-select-branch-btn", root) as HTMLButtonElement;
    button.type = "button";
    button.disabled = isSelected;
    button.textContent = isSelected ? t("warehouseMapPicker.selectedBranch") : t("warehouseMapPicker.selectBranch");
    Object.assign(button.style, {
        marginTop: "8px",
        width: "100%",
        padding: "6px 10px",
        borderRadius: "6px",
        border: "none",
        fontSize: "13px",
        fontWeight: "600",
        cursor: isSelected ? "default" : "pointer",
        background: isSelected ? "#e5e7eb" : MARKER_COLOR,
        color: isSelected ? "#374151" : "#ffffff",
    });
    L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        onSelect();
    });

    return root;
};

// Visual pick-a-warehouse map for Nova Poshta delivery (Leaflet + OpenStreetMap tiles — no API
// key required). Plots warehouses returned for the chosen settlement using the real
// Latitude/Longitude the backend forwards from the Nova Poshta API (see WarehousDto.cs): red
// circleMarkers per NP brand, bounds-filtered to the current viewport and clustered when zoomed
// out so a city with hundreds of branches never tanks render performance. Clicking a pin opens a
// popup with the branch's name/number, address, phone, today's hours, and a "Обрати це
// відділення" button — pressing it (not just clicking the pin) is what actually selects it, the
// same as picking it from the sidebar list or the <Select> dropdown does.
const WarehouseMapPicker: React.FC<WarehouseMapPickerProps> = ({ warehouses, value, onChange, className }) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
    const clustersRef = useRef<L.CircleMarker[]>([]);

    // Map event handlers (moveend/zoomend) are bound once at mount, so they can't close over
    // fresh props — these refs are how they always see the latest onChange/value/warehouses/t
    // without re-binding on every render. Updated in effects (not during render) — refs must
    // never be written while rendering.
    const onChangeRef = useRef(onChange);
    const valueRef = useRef(value);
    const warehousesRef = useRef(warehouses);
    const tRef = useRef(t);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    useEffect(() => {
        warehousesRef.current = warehouses;
    }, [warehouses]);
    useEffect(() => {
        tRef.current = t;
    }, [t]);

    // Re-renders every marker for the current viewport + zoom. Stored in a ref (rather than being
    // a plain function called directly from JSX-adjacent effects) purely so the moveend/zoomend
    // listener bound once at mount always calls the latest version.
    const renderMarkersRef = useRef<() => void>(() => {});
    renderMarkersRef.current = () => {
        const map = mapRef.current;
        if (!map) return;
        const tt = tRef.current;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();
        clustersRef.current.forEach((m) => m.remove());
        clustersRef.current = [];

        const zoom = map.getZoom();
        const bounds = map.getBounds().pad(0.25);
        const visible = warehousesRef.current.filter(hasCoords).filter((w) => bounds.contains([w.latitude, w.longitude]));

        const addPin = (w: GeoWarehouse) => {
            const selected = w.ref === valueRef.current;
            const marker = L.circleMarker([w.latitude, w.longitude], {
                radius: radiusForZoom(zoom),
                weight: 2,
                color: "#ffffff",
                fillColor: selected ? SELECTED_MARKER_COLOR : MARKER_COLOR,
                fillOpacity: 0.9,
            }).addTo(map);

            if (zoom >= CLUSTER_ZOOM_THRESHOLD && w.number) {
                marker.bindTooltip(w.number, {
                    permanent: true,
                    direction: "top",
                    offset: [0, -radiusForZoom(zoom)],
                    className: "np-marker-number",
                });
            }

            marker.bindPopup(() =>
                buildPopupContent(w, w.ref === valueRef.current, tt, () => {
                    onChangeRef.current(w.ref);
                    marker.closePopup();
                })
            );

            markersRef.current.set(w.ref, marker);
        };

        if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
            visible.forEach(addPin);
            return;
        }

        const cells = new Map<string, { items: GeoWarehouse[]; sumLat: number; sumLng: number }>();
        visible.forEach((w) => {
            const pt = map.latLngToContainerPoint([w.latitude, w.longitude]);
            const key = `${Math.floor(pt.x / CLUSTER_CELL_PX)}:${Math.floor(pt.y / CLUSTER_CELL_PX)}`;
            const cell = cells.get(key) ?? { items: [], sumLat: 0, sumLng: 0 };
            cell.items.push(w);
            cell.sumLat += w.latitude;
            cell.sumLng += w.longitude;
            cells.set(key, cell);
        });

        cells.forEach((cell) => {
            if (cell.items.length === 1) {
                addPin(cell.items[0]);
                return;
            }
            // Keep the selected warehouse's own cell expanded so its highlight/popup stay reachable
            // even while the rest of the city is still collapsed into clusters.
            if (cell.items.some((w) => w.ref === valueRef.current)) {
                cell.items.forEach(addPin);
                return;
            }

            const count = cell.items.length;
            const center: L.LatLngTuple = [cell.sumLat / count, cell.sumLng / count];
            const cluster = L.circleMarker(center, {
                radius: Math.min(12 + Math.log2(count) * 3, 26),
                weight: 2,
                color: "#ffffff",
                fillColor: MARKER_COLOR,
                fillOpacity: 0.85,
            })
                .addTo(map)
                .bindTooltip(String(count), { permanent: true, direction: "center", className: "np-cluster-count" })
                .on("click", () => map.setView(center, Math.min(zoom + 3, CLUSTER_ZOOM_THRESHOLD)));
            clustersRef.current.push(cluster);
        });
    };

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        ensurePopupStyles();
        const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;

        // Re-render on every pan/zoom so pins stay bounds-filtered and correctly clustered/sized.
        const handleViewChange = () => renderMarkersRef.current();
        map.on("moveend zoomend", handleViewChange);

        return () => {
            map.off("moveend zoomend", handleViewChange);
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Re-frame + re-plot whenever the warehouse list changes (new settlement chosen).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const plottable = warehouses.filter(hasCoords);
        if (plottable.length > 0) {
            const bounds = L.latLngBounds(plottable.map((w) => [w.latitude, w.longitude] as [number, number]));
            map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
        } else {
            map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        }
        // fitBounds/setView above trigger moveend once their pan/zoom animation settles — render
        // once synchronously too so the map never looks empty in the meantime.
        renderMarkersRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouses]);

    // Re-color + pan/zoom to the selected warehouse whenever `value` changes (from the map, the
    // sidebar list, or the <Select> dropdown).
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const selected = value ? warehousesRef.current.find((w) => w.ref === value) : undefined;
        if (selected && hasCoords(selected)) {
            map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), SELECTED_ZOOM));
        }
        renderMarkersRef.current();
        markersRef.current.get(value)?.openPopup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <div
            ref={containerRef}
            role="application"
            aria-label={t('warehouseMapPicker.ariaLabel')}
            className={className ?? "w-full h-72 rounded-lg overflow-hidden border border-gray-200"}
        />
    );
};

export default WarehouseMapPicker;
