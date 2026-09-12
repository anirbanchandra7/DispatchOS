import { newId } from "@/lib/id";
import { computeDocumentStatus } from "@/lib/documents";
import { DEPOT_LOCATION } from "@/lib/geo-dubai";
import type { CompanyVehicle } from "@/types";

const COMPANY_FLEET: [string, string, CompanyVehicle["vehicleType"], number][] = [
  ["Toyota", "Hiace", "VAN", 1200],
  ["Nissan", "NV200", "VAN", 800],
  ["Toyota", "Hilux", "TRUCK", 1500],
  ["Honda", "CB150", "MOTORBIKE", 25],
  ["Yamaha", "NMAX", "SCOOTER", 25],
  ["Toyota", "Corolla", "CAR", 250],
  ["Nissan", "Sunny", "CAR", 250],
  ["Suzuki", "Super Carry", "VAN", 900],
  ["Mitsubishi", "Canter", "TRUCK", 2000],
  ["Honda", "PCX", "SCOOTER", 25],
];

function randomPlate(): string {
  return `DXB-${4000 + Math.floor(Math.random() * 5999)}`;
}

function futureDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

export function generateCompanyVehicles(): CompanyVehicle[] {
  return COMPANY_FLEET.map(([make, model, vehicleType, capacityKg], idx) => {
    const id = newId();
    const insuranceExpiryDays = [300, 15, 400, -8, 120, 250, 60, 500, 45, 200][idx];
    const registrationExpiryDays = [280, 320, 90, 400, 200, 150, 30, 500, 100, 240][idx];
    const inspectionExpiryDays = [200, 250, 60, 300, 150, 100, 20, 400, 80, 190][idx];
    const statusPool: CompanyVehicle["status"][] = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "MAINTENANCE", "AVAILABLE"];

    return {
      id,
      registrationNumber: randomPlate(),
      make,
      model,
      year: 2018 + (idx % 7),
      vehicleType,
      capacityKg,
      status: statusPool[idx % statusPool.length],
      insuranceExpiry: futureDate(insuranceExpiryDays),
      registrationExpiry: futureDate(registrationExpiryDays),
      inspectionExpiry: futureDate(inspectionExpiryDays),
      documents: [
        {
          id: newId(),
          vehicleId: id,
          type: "VEHICLE_REGISTRATION",
          expiryDate: futureDate(registrationExpiryDays),
          fileRef: `secure://documents/vehicles/${id}/registration.pdf`,
          status: computeDocumentStatus(futureDate(registrationExpiryDays)),
        },
        {
          id: newId(),
          vehicleId: id,
          type: "VEHICLE_INSURANCE",
          expiryDate: futureDate(insuranceExpiryDays),
          fileRef: `secure://documents/vehicles/${id}/insurance.pdf`,
          status: computeDocumentStatus(futureDate(insuranceExpiryDays)),
        },
      ],
      currentLat: DEPOT_LOCATION.lat + (Math.random() - 0.5) * 0.01,
      currentLng: DEPOT_LOCATION.lng + (Math.random() - 0.5) * 0.01,
      createdAt: futureDate(-500),
      updatedAt: futureDate(-2),
    };
  });
}
