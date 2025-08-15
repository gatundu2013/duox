import { pgEnum } from "drizzle-orm/pg-core";

export const UserRole = pgEnum("user_role", ["admin", "player"]);
export const betStatus = pgEnum("bet_status", ["pending", "busted", "won"]);
