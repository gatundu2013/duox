import { boolean, decimal, pgTable, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { BetStatus, timestamps } from "./enums";
import { roundsTable } from "./round";
import { BetStatusEnum } from "../../types/backend/bet";

export const betsTable = pgTable("bets", {
  betId: uuid("bet_id").notNull().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.userId),
  roundId: uuid("round_id")
    .notNull()
    .references(() => roundsTable.roundId),
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
  status: BetStatus("status").notNull().default(BetStatusEnum.PENDING),
  ...timestamps,
});
