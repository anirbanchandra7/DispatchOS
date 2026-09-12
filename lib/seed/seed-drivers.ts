import { newId } from "@/lib/id";
import { computeDocumentStatus } from "@/lib/documents";
import { DEPOT_LOCATION, pickRandomArea, randomAreaPoint } from "@/lib/geo-dubai";
import type { Driver, DriverDocument, DriverOwnedVehicle } from "@/types";

const DRIVER_NAMES: { name: string; ownVehicle: boolean; type: Driver["employmentType"] }[] = [
  { name: "Rahul Sharma", ownVehicle: true, type: "GIG" },
  { name: "Mohammed Ali", ownVehicle: true, type: "FULL_TIME" },
  { name: "Jose Santos", ownVehicle: false, type: "FULL_TIME" },
  { name: "Ahmed Hassan", ownVehicle: true, type: "GIG" },
  { name: "Ravi Kumar", ownVehicle: false, type: "PART_TIME" },
  { name: "Faisal Iqbal", ownVehicle: true, type: "FULL_TIME" },
  { name: "Carlos Mendes", ownVehicle: false, type: "FULL_TIME" },
  { name: "Imran Sheikh", ownVehicle: true, type: "GIG" },
  { name: "Suresh Nair", ownVehicle: false, type: "PART_TIME" },
  { name: "Zeeshan Malik", ownVehicle: true, type: "FULL_TIME" },
  { name: "Michael Cruz", ownVehicle: false, type: "GIG" },
  { name: "Tariq Aziz", ownVehicle: true, type: "FULL_TIME" },
];

const OWN_VEHICLE_MODELS: [string, string, "MOTORBIKE" | "SCOOTER" | "CAR"][] = [
  ["Honda", "PCX", "SCOOTER"],
  ["Yamaha", "NMAX", "SCOOTER"],
  ["Honda", "CB150", "MOTORBIKE"],
  ["Toyota", "Corolla", "CAR"],
  ["Suzuki", "Gixxer", "MOTORBIKE"],
  ["Yamaha", "YBR125", "MOTORBIKE"],
];

function randomPlate(): string {
  const codes = ["DXB", "AUH", "SHJ"];
  const code = codes[Math.floor(Math.random() * codes.length)];
  return `${code}-${1000 + Math.floor(Math.random() * 8999)}`;
}

function randomPhone(): string {
  return `+9715${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function futureDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

function makeDocument(driverId: string, type: DriverDocument["type"], docNumber: string, expiryDays: number): DriverDocument {
  const expiryDate = futureDate(expiryDays);
  return {
    id: newId(),
    driverId,
    type,
    documentNumber: docNumber,
    expiryDate,
    fileRef: `secure://documents/${driverId}/${type.toLowerCase()}.pdf`,
    status: computeDocumentStatus(expiryDate),
    uploadedAt: futureDate(-180),
  };
}

export function generateDrivers(): { drivers: Driver[]; ownedVehicles: DriverOwnedVehicle[] } {
  const drivers: Driver[] = [];
  const ownedVehicles: DriverOwnedVehicle[] = [];

  DRIVER_NAMES.forEach((d, idx) => {
    const driverId = newId();
    const area = pickRandomArea();
    const pos = randomAreaPoint(area, 2);

    // Vary licence expiry to demonstrate valid / expiring soon / expired states
    const licenceExpiryDaysOptions = [400, 20, -5, 200, 90, 365];
    const licenceExpiryDays = licenceExpiryDaysOptions[idx % licenceExpiryDaysOptions.length];
    const licenceExpiry = futureDate(licenceExpiryDays);

    const documents: DriverDocument[] = [
      makeDocument(driverId, "DRIVING_LICENCE", `DL-${100000 + idx}`, licenceExpiryDays),
      makeDocument(driverId, "ID_DOCUMENT", `ID-${200000 + idx}`, 500),
    ];

    let ownVehicleId: string | undefined;
    if (d.ownVehicle) {
      const [make, model, vehicleType] = OWN_VEHICLE_MODELS[idx % OWN_VEHICLE_MODELS.length];
      const vId = newId();
      const insuranceExpiryDays = [300, 25, 400, -10][idx % 4];
      const registrationExpiryDays = 250;
      ownedVehicles.push({
        id: vId,
        driverId,
        registrationNumber: randomPlate(),
        make,
        model,
        year: 2019 + (idx % 6),
        vehicleType,
        colour: ["White", "Black", "Silver", "Red", "Blue"][idx % 5],
        insuranceExpiry: futureDate(insuranceExpiryDays),
        registrationExpiry: futureDate(registrationExpiryDays),
        status: "AVAILABLE",
        capacityKg: vehicleType === "CAR" ? 250 : 25,
        documents: [
          {
            id: newId(),
            vehicleId: vId,
            type: "VEHICLE_REGISTRATION",
            expiryDate: futureDate(registrationExpiryDays),
            fileRef: `secure://documents/vehicles/${vId}/registration.pdf`,
            status: computeDocumentStatus(futureDate(registrationExpiryDays)),
          },
          {
            id: newId(),
            vehicleId: vId,
            type: "VEHICLE_INSURANCE",
            expiryDate: futureDate(insuranceExpiryDays),
            fileRef: `secure://documents/vehicles/${vId}/insurance.pdf`,
            status: computeDocumentStatus(futureDate(insuranceExpiryDays)),
          },
        ],
        createdAt: futureDate(-300),
        updatedAt: futureDate(-1),
      });
      ownVehicleId = vId;
    }

    const statuses: Driver["status"][] = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE", "ON_BREAK", "OFFLINE"];
    const status = statuses[idx % statuses.length];

    drivers.push({
      id: driverId,
      fullName: d.name,
      phone: randomPhone(),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name)}`,
      licenceNumber: `UAE-DL-${300000 + idx}`,
      licenceExpiry,
      status,
      employmentType: d.type,
      hasOwnVehicle: d.ownVehicle,
      ownVehicleId,
      currentLat: pos.lat,
      currentLng: pos.lng,
      currentLocationLabel: area.name,
      shiftStart: futureDate(-0.3),
      shiftEnd: futureDate(0.3),
      onShift: status !== "OFFLINE" && status !== "INACTIVE",
      deliveryCount: 20 + Math.floor(Math.random() * 400),
      successfulDeliveries: 0,
      failedDeliveries: Math.floor(Math.random() * 4),
      rating: Math.round((4 + Math.random()) * 10) / 10,
      documents,
      homeDepotLat: DEPOT_LOCATION.lat,
      homeDepotLng: DEPOT_LOCATION.lng,
      createdAt: futureDate(-400),
      updatedAt: futureDate(-1),
    });
  });

  drivers.forEach((d) => {
    d.successfulDeliveries = d.deliveryCount - d.failedDeliveries;
  });

  return { drivers, ownedVehicles };
}
