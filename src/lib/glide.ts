export const BUKIDNON = { lat: 8.1575, lng: 125.1278 };

export type ServiceId = "moto" | "fetch" | "plus";

export const SERVICES: {
  id: ServiceId;
  code: string;
  name: string;
  meta: string;
  fare: number; // in centavos
}[] = [
  { id: "moto", code: "M", name: "Moto", meta: "solo ride · 3 min", fare: 0 },
  { id: "fetch", code: "F", name: "Fetch anything", meta: "pabili / errand · 6 min", fare: 4900 },
  { id: "plus", code: "P", name: "Moto Plus", meta: "helmet + box · 5 min", fare: 9900 },
];

export function peso(cents: number) {
  return cents === 0 ? "Free" : `₱${(cents / 100).toFixed(2)}`;
}

export function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "G"
  );
}

export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(BUKIDNON);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(BUKIDNON),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
