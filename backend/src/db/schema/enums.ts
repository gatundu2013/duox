import { pgEnum, timestamp } from "drizzle-orm/pg-core";
import {
  BetStatusEnum,
  RoundStatusEnum,
  UserRoleEnum,
  VehicleTypeEnum,
} from "../../types/shared/enums";

export const UserRole = pgEnum("user_role", UserRoleEnum);
export const BetStatus = pgEnum("bet_status", BetStatusEnum);
export const VehicleType = pgEnum("vehicle_type", VehicleTypeEnum);
export const RoundStatus = pgEnum("round_status", RoundStatusEnum);

export const timestamps = {
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
};
