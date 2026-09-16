import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import customerController from "./customer.controller";
import { addCustomerNoteSchema, addCustomerReviewSchema, createCustomerSchema, updateCustomerSchema } from "./customer.validation";

const router = Router();
router.use(authMiddleware, isAdmin);
router.get("/", customerController.getCustomers);
router.post("/", validate(createCustomerSchema), customerController.createCustomer);
router.get("/:id", customerController.getCustomer360);
router.patch("/:id", validate(updateCustomerSchema), customerController.updateCustomer);
router.post("/:id/notes", validate(addCustomerNoteSchema), customerController.addNote);
router.post("/:id/reviews", validate(addCustomerReviewSchema), customerController.addReview);
export default router;
