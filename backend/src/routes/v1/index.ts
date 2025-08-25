import { Router } from "express";
import { authRouterV1 } from "./auth";

export const v1Router = Router();

v1Router.use("/auth", authRouterV1);
