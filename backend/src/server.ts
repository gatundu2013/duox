import "./config/env";
import { connectPostgres } from "./db/connection/postgres";
import { connectRedis } from "./db/connection/redis";

connectPostgres();
connectRedis();
