import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Renders nothing — just scrolls the viewport back to the top whenever the route (pathname)
// changes, so e.g. opening an advert from the middle of a long catalog page always starts
// at the top instead of keeping the previous page's scroll offset.
const ScrollToTop: React.FC = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
