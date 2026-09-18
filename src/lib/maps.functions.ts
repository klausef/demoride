import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function creds() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) throw new Error("Maps service is not configured");
  return { lovableKey, mapsKey };
}

export type PlaceHit = { label: string; address: string; lat: number; lng: number };

/** Search places by text, biased to the user's area. */
export const searchPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; lat?: number; lng?: number }) => {
    const query = String(input?.query ?? "").trim().slice(0, 120);
    if (query.length < 3) throw new Error("Type at least 3 characters");
    return { query, lat: input.lat, lng: input.lng };
  })
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    const { lovableKey, mapsKey } = creds();
    const body: Record<string, unknown> = { textQuery: data.query, pageSize: 6 };
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      body["locationBias"] = {
        circle: { center: { latitude: data.lat, longitude: data.lng }, radius: 25000 },
      };
    }
    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Places searchText failed [${res.status}]: ${text}`);
      throw new Error(`Place search failed [${res.status}]`);
    }
    const json = (await res.json()) as {
      places?: {
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }[];
    };
    return (json.places ?? [])
      .filter((p) => p.location)
      .map((p) => ({
        label: p.displayName?.text ?? p.formattedAddress ?? "Unnamed place",
        address: p.formattedAddress ?? "",
        lat: p.location!.latitude,
        lng: p.location!.longitude,
      }));
  });

/** Turn coordinates into a human readable address. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lat: number; lng: number }) => {
    if (typeof input?.lat !== "number" || typeof input?.lng !== "number") {
      throw new Error("Invalid coordinates");
    }
    return { lat: input.lat, lng: input.lng };
  })
  .handler(async ({ data }): Promise<{ label: string }> => {
    const { lovableKey, mapsKey } = creds();
    const res = await fetch(
      `${GATEWAY}/maps/api/geocode/json?latlng=${data.lat},${data.lng}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`Reverse geocode failed [${res.status}]: ${text}`);
      return { label: `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}` };
    }
    const json = (await res.json()) as { results?: { formatted_address?: string }[] };
    return {
      label:
        json.results?.[0]?.formatted_address ??
        `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
    };
  });
