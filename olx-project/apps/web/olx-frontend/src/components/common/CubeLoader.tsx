import React from "react";
import "./CubeLoader.css";

interface CubeLoaderProps {
    /** Cube color — defaults to the OLX/MultiMart teal brand color. */
    color?: string;
    /** Grid size in px (width == height) — defaults to 40px. */
    size?: number;
    className?: string;
}

// SpinKit "cube-grid" loader — a 3x3 grid of cubes that pulse in a staggered wave (see
// CubeLoader.css for the keyframes/timing-offset per cube). Rendered inside a centered,
// full-screen darkened/blurred overlay so a loading state reads as a deliberate blocking
// transition instead of a small inline spinner that can flash unnoticed.
const CubeLoader: React.FC<CubeLoaderProps> = ({ color = "#002f34", size = 40, className }) => {
    return (
        <div className="cube-loader-overlay" role="status" aria-label="Завантаження">
            <div className={`cube-grid ${className ?? ""}`} style={{ width: size, height: size }}>
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="cube" style={{ backgroundColor: color }} />
                ))}
            </div>
        </div>
    );
};

export default CubeLoader;
