// src/utils/vehicleLookup.js
//
// Brand/model suggestions and VIN decoding for the Vehicle Details step.
// Nothing here touches the database: make/model are saved as plain strings
// in vehicles.manufacturer / vehicles.model, exactly as before.
//
// Suggestion sources, merged in this order of priority:
//   1. "Recently used" on this device (localStorage) - most-used first
//   2. The bundled catalog (src/data/vehicleCatalog.js)
// Typing anything else is always allowed.

import { VEHICLE_CATALOG } from "@/data/VehicleCatalog";

const RECENT_KEY = "vehicleRecent:v1";
const RECENT_LIMIT = 200;

const lc = (s) => (s ?? "").toString().trim().toLowerCase();

function typeKey(vehicleType) {
  const t = (vehicleType ?? "CAR").toString().toUpperCase();
  return t === "TRICYCLE" ? "MOTORCYCLE" : VEHICLE_CATALOG[t] ? t : "CAR";
}

// ---- recently used (per device) ------------------------------------------

function readRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecent(entries) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or blocked - suggestions just won't persist */
  }
}

// Call after a repair order is created successfully.
export function rememberVehicle(vehicleType, make, model) {
  const type = typeKey(vehicleType);
  const brand = canonicalBrand(vehicleType, make) ?? (make ?? "").trim();
  if (!brand) return;
  const modelName = canonicalModel(vehicleType, brand, model) ?? (model ?? "").trim();

  const entries = readRecent();
  const hit = entries.find(
    (e) => e.type === type && lc(e.make) === lc(brand) && lc(e.model) === lc(modelName)
  );
  if (hit) hit.count += 1;
  else entries.push({ type, make: brand, model: modelName, count: 1 });

  entries.sort((a, b) => b.count - a.count);
  writeRecent(entries.slice(0, RECENT_LIMIT));
}

// ---- suggestions -----------------------------------------------------------

// Sort by usage count (desc), then alphabetically.
function rank(names, usage) {
  return [...names].sort((a, b) => (usage[lc(b)] ?? 0) - (usage[lc(a)] ?? 0) || a.localeCompare(b));
}

export function getBrands(vehicleType) {
  const type = typeKey(vehicleType);
  const names = new Map(); // lowercase -> canonical display name
  Object.keys(VEHICLE_CATALOG[type]).forEach((b) => names.set(lc(b), b));

  const usage = {};
  readRecent()
    .filter((e) => e.type === type)
    .forEach((e) => {
      if (!names.has(lc(e.make))) names.set(lc(e.make), e.make);
      usage[lc(e.make)] = (usage[lc(e.make)] ?? 0) + e.count;
    });

  return rank([...names.values()], usage);
}

export function canonicalBrand(vehicleType, name) {
  const q = lc(name);
  if (!q) return null;
  return getBrands(vehicleType).find((b) => lc(b) === q) ?? null;
}

// Models for ONE brand only. Unknown brand => empty list (free typing still works).
export function getModels(vehicleType, make) {
  const brand = canonicalBrand(vehicleType, make);
  if (!brand) return [];
  const type = typeKey(vehicleType);

  const names = new Map();
  const catalogKey = Object.keys(VEHICLE_CATALOG[type]).find((b) => lc(b) === lc(brand));
  (VEHICLE_CATALOG[type][catalogKey] ?? []).forEach((m) => names.set(lc(m), m));

  const usage = {};
  readRecent()
    .filter((e) => e.type === type && lc(e.make) === lc(brand) && e.model)
    .forEach((e) => {
      if (!names.has(lc(e.model))) names.set(lc(e.model), e.model);
      usage[lc(e.model)] = (usage[lc(e.model)] ?? 0) + e.count;
    });

  return rank([...names.values()], usage);
}

export function canonicalModel(vehicleType, make, name) {
  const q = lc(name);
  if (!q) return null;
  return getModels(vehicleType, make).find((m) => lc(m) === q) ?? null;
}

// ---- VIN decoding (NHTSA vPIC, free, no API key) --------------------------
//
// IMPORTANT: this goes VIN -> make/model/year. The reverse (make+model -> VIN)
// is impossible: a VIN identifies one physical vehicle, not a model.
// vPIC's data is North-American-market focused, so many Philippine-market
// vehicles will come back "not found". That is expected; callers must treat
// it as a hint, never as required.

function titleCase(s) {
  return (s ?? "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim();
}

function mapVehicleType(vpicType) {
  const t = lc(vpicType);
  if (!t) return null;
  if (t.includes("motorcycle")) return "Motorcycle";
  return "Car"; // passenger car, MPV, truck, etc.
}

export async function decodeVin(vin, callerSignal, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onCallerAbort = () => ctrl.abort();
  callerSignal?.addEventListener("abort", onCallerAbort);

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
      { signal: ctrl.signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const r = (await res.json())?.Results?.[0];
    if (!r || !r.Make) return { found: false };

    const vehicleType = mapVehicleType(r.VehicleType);
    const make = canonicalBrand(vehicleType ?? "Car", r.Make) ?? titleCase(r.Make);
    const model = r.Model ? canonicalModel(vehicleType ?? "Car", make, r.Model) ?? r.Model : "";

    return { found: true, make, model, year: r.ModelYear || "", vehicleType };
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
}