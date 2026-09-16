import { Router } from "express";
import fieldOpsController from "./fieldOps.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { addInternalNoteSchema, addPhotoSchema, assignJobSchema, reportIssueSchema, resolveIssueSchema, updateChecklistSchema, updateJobStatusSchema } from "./fieldOps.validation";

const router = Router();
router.use(authMiddleware);

router.get("/me/overview", requireRoles("cleaner"), fieldOpsController.myOverview);
router.get("/me/jobs", requireRoles("cleaner"), fieldOpsController.myJobs);
router.get("/jobs", requireRoles("owner", "admin", "manager", "dispatcher", "support", "read_only"), fieldOpsController.listJobs);
router.get("/jobs/:id", fieldOpsController.getJob);
router.patch("/jobs/:id/assignment", requireRoles("owner", "admin", "manager", "dispatcher"), validate(assignJobSchema), fieldOpsController.assignJob);
router.patch("/jobs/:id/status", requireRoles("owner", "admin", "manager", "dispatcher", "cleaner"), validate(updateJobStatusSchema), fieldOpsController.updateStatus);
router.patch("/jobs/:id/checklist", requireRoles("owner", "admin", "manager", "dispatcher", "cleaner"), validate(updateChecklistSchema), fieldOpsController.updateChecklist);
router.post("/jobs/:id/photos", requireRoles("owner", "admin", "manager", "dispatcher", "cleaner"), validate(addPhotoSchema), fieldOpsController.addPhoto);
router.post("/jobs/:id/notes", requireRoles("owner", "admin", "manager", "dispatcher", "cleaner"), validate(addInternalNoteSchema), fieldOpsController.addNote);
router.post("/jobs/:id/issues", requireRoles("owner", "admin", "manager", "dispatcher", "cleaner"), validate(reportIssueSchema), fieldOpsController.reportIssue);
router.patch("/jobs/:id/issues/:issueKey", requireRoles("owner", "admin", "manager", "dispatcher", "cleaner"), validate(resolveIssueSchema), fieldOpsController.resolveIssue);

export default router;
