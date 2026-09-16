import { Router } from "express";
import assetController from "./asset.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import {
  cloudinaryFileUploadMiddleware,
  processCloudinarySingleUpload,
} from "../../middlewares/fileUpload.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  requireRoles("owner", "admin", "manager", "dispatcher", "cleaner", "support"),
  cloudinaryFileUploadMiddleware().single("file"),
  processCloudinarySingleUpload("assets", "file"),
  assetController.uploadAsset,
);

export default router;
