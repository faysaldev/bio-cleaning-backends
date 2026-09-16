import { Router } from "express";
import assetController from "./asset.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import {
  fileUploadMiddleware,
  processR2SingleUpload,
} from "../../middlewares/fileUpload.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  requireRoles("owner", "admin", "manager", "dispatcher", "cleaner", "support"),
  fileUploadMiddleware().single("file"),
  processR2SingleUpload("assets", "file"),
  assetController.uploadAsset,
);

export default router;
