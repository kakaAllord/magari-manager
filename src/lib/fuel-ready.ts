// Fuel can be asked for a car once it has a fuel type, a tank size and a starting reading: the
// gauge turns into litres through the tank, and every stretch is measured from a reading.
export const fuelReadySql = (car: string) =>
  `(${car}.fuel_type IS NOT NULL AND ${car}.tank_litres IS NOT NULL
    AND EXISTS (SELECT 1 FROM fuel_readings fr WHERE fr.car_id = ${car}.id))`;

// What a car still lacks before fuel can be asked for it, in Swahili, e.g. "tanki na kipimo cha sasa".
export function missingForFuel(car: { fuelType: string | null; tank: number | null; measured: boolean }) {
  const missing = [
    !car.fuelType && "aina ya mafuta",
    !car.tank && "tanki",
    !car.measured && "kipimo cha sasa",
  ].filter((x): x is string => Boolean(x));
  return missing.length <= 1 ? missing.join("") : `${missing.slice(0, -1).join(", ")} na ${missing.at(-1)}`;
}
