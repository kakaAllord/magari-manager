import { sw, type Tr } from "./i18n.ts";

// Fuel can be asked for a car once it has a fuel type, a tank size and a starting reading: the
// gauge turns into litres through the tank, and every stretch is measured from a reading.
export const fuelReadySql = (car: string) =>
  `(${car}.fuel_type IS NOT NULL AND ${car}.tank_litres IS NOT NULL
    AND EXISTS (SELECT 1 FROM fuel_readings fr WHERE fr.car_id = ${car}.id))`;

// What a car still lacks before fuel can be asked for it, e.g. "tanki na kipimo cha sasa".
export function missingForFuel(car: { fuelType: string | null; tank: number | null; measured: boolean }, t: Tr = sw) {
  const missing = [
    !car.fuelType && t("aina ya mafuta", "fuel type"),
    !car.tank && t("tanki", "tank size"),
    !car.measured && t("kipimo cha sasa", "current reading"),
  ].filter((x): x is string => Boolean(x));
  return missing.length <= 1 ? missing.join("") : `${missing.slice(0, -1).join(", ")} ${t("na", "and")} ${missing.at(-1)}`;
}
