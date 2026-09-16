import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { refundSchema } from "../Invoice/invoice.validation";
import paymentController from "./payment.controller";
const router=Router();router.use(authMiddleware,isAdmin);router.get("/",paymentController.list);router.get("/recurring",paymentController.recurring);router.post("/recurring/:id/cancel",requireRoles("owner","admin","manager"),paymentController.cancelRecurring);router.post("/:id/refund",requireRoles("owner","admin","manager"),validate(refundSchema),paymentController.refund);export default router;
