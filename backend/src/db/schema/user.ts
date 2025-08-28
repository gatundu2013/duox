import {
  pgTable,
  uuid,
  varchar,
  char,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { UserRole, timestamps } from "./enums";
import { UserRoleEnum } from "../../types/shared/enums";

export const usersTable = pgTable("users", {
  userId: uuid("user_id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 30 }).unique().notNull(),
  phoneNumber: char("phone_number", { length: 10 }).unique().notNull(),
  accountBalance: decimal("account_balance", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  password: varchar("password", { length: 90 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  role: UserRole("role").notNull().default(UserRoleEnum.PLAYER),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  ...timestamps,
});

export type SelectUserT = typeof usersTable.$inferSelect;
export type InsertUserT = typeof usersTable.$inferInsert;
