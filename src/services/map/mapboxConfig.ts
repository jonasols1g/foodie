export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Mapbox sin standard fargerike stil (avvik fra den dempede stilen i
// design/README.md — eksplisitt bedt om av bruker).
export const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/streets-v12";

// Oslo — fallback-senter når det ikke finnes restauranter å sentrere kartet
// rundt ennå.
export const DEFAULT_MAP_CENTER = { lat: 59.9139, lng: 10.7522 };
export const DEFAULT_MAP_ZOOM = 11;
