import { Router } from "express";
import assetController from "./asset.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  cloudinaryFileUploadMiddleware,
  processCloudinarySingleUpload,
} from "../../middlewares/fileUpload.middleware";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  cloudinaryFileUploadMiddleware().single("file"),
  processCloudinarySingleUpload("assets", "file"),
  assetController.uploadAsset
);

export default router;
