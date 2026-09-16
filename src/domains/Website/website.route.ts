import { Router } from "express";
import websiteController from "./website.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createMediaSchema, publishWebsiteSchema, updateWebsiteDraftSchema } from "./website.validation";

const router = Router();

router.get("/public", websiteController.getPublic);
router.get("/preview/:token", websiteController.getPreview);

router.use(authMiddleware);
router.get("/admin", requireRoles("owner", "admin", "manager", "support", "read_only"), websiteController.getAdmin);
router.get("/revisions", requireRoles("owner", "admin", "manager", "support", "read_only"), websiteController.revisions);
router.get("/media", requireRoles("owner", "admin", "manager", "support", "read_only"), websiteController.media);
router.post("/preview-token", requireRoles("owner", "admin", "manager"), websiteController.previewToken);
router.patch("/draft", requireRoles("owner", "admin", "manager"), validate(updateWebsiteDraftSchema), websiteController.updateDraft);
router.post("/publish", requireRoles("owner", "admin", "manager"), validate(publishWebsiteSchema), websiteController.publish);
router.post("/reset-draft", requireRoles("owner", "admin", "manager"), websiteController.resetDraft);
router.post("/revisions/:revision/restore", requireRoles("owner", "admin", "manager"), websiteController.restoreRevision);
router.post("/media", requireRoles("owner", "admin", "manager"), validate(createMediaSchema), websiteController.createMedia);
router.delete("/media/:id", requireRoles("owner", "admin", "manager"), websiteController.deleteMedia);

export default router;
