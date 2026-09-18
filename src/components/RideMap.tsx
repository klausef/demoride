import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
    __glideMapReady?: () => void;
  }
}

let loader: Promise<any> | null = null;

function loadMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? "";
    if (!key) {
      reject(new Error("Map key missing"));
      return;
    }
    window.__glideMapReady = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__glideMapReady&channel=${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Map failed to load"));
    document.head.appendChild(s);
  });
  return loader;
}

const NIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b1020" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1020" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7d8aa5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2238" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#232d4a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ff6a2b" }, { lightness: -55 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050810" }] },
];

export type LatLng = { lat: number; lng: number };
export type MapMarker = { position: LatLng; kind: "pickup" | "dropoff" | "me" | "rider"; title?: string };

function dot(color: string, scale: number, maps: any) {
  return {
    path: maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

export function RideMap({
  center,
  markers,
  route,
  onMapClick,
  className = "",
}: {
  center: LatLng;
  markers: MapMarker[];
  route?: [LatLng, LatLng] | null;
  onMapClick?: (p: LatLng) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<any>(null);
  const drawn = useRef<any[]>([]);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then((maps) => {
        if (cancelled || !el.current || map.current) return;
        map.current = new maps.Map(el.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          backgroundColor: "#070a12",
          styles: NIGHT_STYLE,
        });
        map.current.addListener("click", (e: any) => {
          clickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !map.current) return;
    drawn.current.forEach((d) => d.setMap(null));
    drawn.current = [];

    markers.forEach((m) => {
      const color =
        m.kind === "pickup"
          ? "#e8edf7"
          : m.kind === "dropoff"
            ? "#ff6a2b"
            : m.kind === "me"
              ? "#3ba0ff"
              : "#ffc46a";
      drawn.current.push(
        new maps.Marker({
          position: m.position,
          map: map.current,
          title: m.title ?? "",
          icon: dot(color, m.kind === "rider" ? 6 : 8, maps),
          zIndex: m.kind === "me" ? 5 : 3,
        }),
      );
    });

    if (route) {
      drawn.current.push(
        new maps.Polyline({
          path: route,
          map: map.current,
          strokeColor: "#ff6a2b",
          strokeOpacity: 0.9,
          strokeWeight: 4,
        }),
      );
      const b = new maps.LatLngBounds();
      route.forEach((p) => b.extend(p));
      map.current.fitBounds(b, 70);
    } else if (markers.length) {
      map.current.panTo(markers[0]!.position);
    }
  }, [markers, route]);

  useEffect(() => {
    if (map.current && !route) map.current.panTo(center);
  }, [center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className={className} aria-label="Map" />;
}
