import http from "http";
import { PORT } from "./config/ENV";
import app from "./server";
import connectionToDb from "./config/db";

connectionToDb();

// For local development and persistent servers
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const server = http.createServer(app);
  
  server.listen(PORT || 9500, () => {
    console.log(`Server is running at http://localhost:${PORT || 9500}`);
  });
}

// Export the app for Vercel
export default app;
