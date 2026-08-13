export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Dempet lys stil (se design/README.md — "Mapbox-stil") — Light v11 er den
// pragmatiske varianten av de to alternativene designet nevner (en egen
// Mapbox Studio-stil med tilpassede land-/vann-/veifarger krever en
// hostet stil vi ikke har).
export const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/light-v11";

// Oslo — fallback-senter når det ikke finnes restauranter å sentrere kartet
// rundt ennå.
export const DEFAULT_MAP_CENTER = { lat: 59.9139, lng: 10.7522 };
export const DEFAULT_MAP_ZOOM = 11;
