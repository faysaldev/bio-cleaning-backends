import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import customerController from "./customer.controller";
import { addCustomerNoteSchema, addCustomerReviewSchema, createCustomerSchema, updateCustomerSchema } from "./customer.validation";

const router = Router();
router.use(authMiddleware, isAdmin);
router.get("/", customerController.getCustomers);
router.post("/", requireRoles("owner", "admin", "manager", "dispatcher", "support"), validate(createCustomerSchema), customerController.createCustomer);
router.get("/:id", customerController.getCustomer360);
router.patch("/:id", requireRoles("owner", "admin", "manager", "dispatcher", "support"), validate(updateCustomerSchema), customerController.updateCustomer);
router.post("/:id/notes", requireRoles("owner", "admin", "manager", "dispatcher", "support"), validate(addCustomerNoteSchema), customerController.addNote);
router.post("/:id/reviews", requireRoles("owner", "admin", "manager", "support"), validate(addCustomerReviewSchema), customerController.addReview);
export default router;
