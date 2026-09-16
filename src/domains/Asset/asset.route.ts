import { Router } from "express";
import assetController from "./asset.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import {
  cloudinaryFileUploadMiddleware,
  processCloudinarySingleUpload,
} from "../../middlewares/fileUpload.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  isAdmin,
  cloudinaryFileUploadMiddleware().single("file"),
  processCloudinarySingleUpload("assets", "file"),
  assetController.uploadAsset
);

export default router;
