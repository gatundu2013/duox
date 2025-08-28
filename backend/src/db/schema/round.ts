import {
  bigint,
  decimal,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { RoundStatus, timestamps, VehicleType } from "./enums";
import { usersTable } from "./user";
import { RoundStatusEnum } from "../../types/shared/enums";

export const roundsTable = pgTable("rounds", {
  roundId: uuid("round_id").notNull().primaryKey(),
  status: RoundStatus("status").notNull().default(RoundStatusEnum.PENDING),
  serverSeed: varchar("server_seed", { length: 100 }).notNull(),
  hashedServerSeed: varchar("hashed_server_seed", { length: 100 }).notNull(),
  clientSeed: varchar("client_seed", { length: 100 }).notNull(),
  roundHash: varchar("round_hash", { length: 100 }).notNull(),
  hashAsDecimal: bigint("hash_as_decimal", { mode: "bigint" }).notNull(),
  normalizedValue: decimal("normalized_value", {
    precision: 3,
    scale: 2,
  }).notNull(),
  rawMultiplier: integer("raw_multiplier").notNull(),
  finalMultiplier: integer("final_multiplier").notNull(),
  houseEdge: decimal("house_edge", { precision: 3, scale: 2 }).notNull(),
  vehicleType: VehicleType("vehicle_type").notNull(),
  ...timestamps,
});

export const roundStatsTable = pgTable("round_stats", {
  roundId: uuid("round_id")
    .notNull()
    .references(() => roundsTable.roundId)
    .primaryKey(),

  totalBetAmount: decimal("total_bet_amount", {
    precision: 20,
    scale: 2,
  }).notNull(),
  totalCashoutAmount: decimal("total_cashout_amount", {
    precision: 20,
    scale: 2,
  }),
  profit: decimal("profit", { precision: 20, scale: 2 }),
  bets: integer("bets").notNull(),
  cashouts: integer("cashouts").notNull(),
  ...timestamps,
});

export const clientSeedDetailsTable = pgTable("client_seed_details", {
  id: uuid("id").notNull().primaryKey(),
  roundId: uuid("round_id")
    .notNull()
    .references(() => roundsTable.roundId),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.userId),
  seed: varchar("seed", { length: 20 }).notNull(),
});
