import type { UserRole } from "@/types";

export const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "OPERATIONS_MANAGER",
  "FULFILMENT_OPERATOR",
  "DISPATCHER",
  "DRIVER",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  OPERATIONS_MANAGER: "Operations Manager",
  FULFILMENT_OPERATOR: "Fulfilment Operator",
  DISPATCHER: "Dispatcher",
  DRIVER: "Driver",
};

export const ROLE_DEMO_NAME: Record<UserRole, string> = {
  ADMIN: "Aisha Al Farsi",
  OPERATIONS_MANAGER: "Omar Khan",
  FULFILMENT_OPERATOR: "Fatima Noor",
  DISPATCHER: "Yusuf Rahman",
  DRIVER: "Rahul Sharma",
};
