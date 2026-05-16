import express, { Request, Response } from "express";
import routes from "./routes/index";
import logRequestResponse from "./middlewares/logger.middleware";
import compression from "compression";
import { globalErrorHandler, notFoundHandler } from "./lib/errorsHandle";
import cors from "cors";

const app = express();

app.use(express.json());

// TODO: for local only
app.use(
  cors({
    origin: "*", // allow only this origin to access the API
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // allow only these HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // allow only these headers
  }),
);

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// compression the all data
app.use(compression());

// Use the logging middleware for all routes
// app.use(logRequestResponse);

// Use the centralized routes
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript with Node and Express!");
});

app.use("/api/v1", routes);

// Handle 404 - Route not found
app.use(notFoundHandler);

// Global error handler - must be last middleware
app.use(globalErrorHandler);

export default app;
