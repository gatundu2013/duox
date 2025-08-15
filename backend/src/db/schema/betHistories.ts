import {
  boolean,
  decimal,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { betStatus } from "./enums";

export const betsTable = pgTable("bets", {
  // Todo: Reference roundId
  betId: uuid("bet_id").notNull().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userTable.userId),
  stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),
  payout: decimal("payout", { precision: 10, scale: 2 }),
  autoCashoutMultiplier: decimal("auto_cashout_multiplier", {
    precision: 10,
    scale: 2,
  }),
  hasAutoCashout: boolean("has_auto_cashout").default(false),
  cashoutMultiplier: decimal("cashout_multiplier", {
    precision: 10,
    scale: 2,
  }),
  status: betStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});
