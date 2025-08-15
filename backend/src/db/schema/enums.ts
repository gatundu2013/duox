import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const UserRole = pgEnum("user_role", ["admin", "player"]);
export const BetStatus = pgEnum("bet_status", ["pending", "busted", "won"]);
export const VehicleType = pgEnum("vehicle_type", ["matatu", "bodaboda"]);
export const RoundStatus = pgEnum("round_status", [
  "pending",
  "running",
  "ended",
]);

export const timestamps = {
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
};
