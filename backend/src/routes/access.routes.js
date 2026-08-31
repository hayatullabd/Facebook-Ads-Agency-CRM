import { Router } from "express";
import { getAccessMatrix } from "../controllers/access.controller.js";

const router = Router();

router.get("/matrix", getAccessMatrix);

export default router;
