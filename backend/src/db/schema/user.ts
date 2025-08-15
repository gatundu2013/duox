import {
  pgTable,
  uuid,
  varchar,
  char,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const UserRoles = pgEnum("user_role", ["player", "admin"]);

export const userTable = pgTable("users", {
  userId: uuid("user_id").notNull().primaryKey(),
  username: varchar("username", { length: 30 }).unique().notNull(),
  phoneNumber: char("phone_number", { length: 10 }).unique().notNull(),
  accountBalance: decimal("account_balance", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  password: varchar("password", { length: 90 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  role: UserRoles("role").notNull().default("player"),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});
