import "./config/env";
import { connectPostgres, connectRedis } from "./db";

connectPostgres();
connectRedis();
