import http from "http";
import { PORT } from "./config/ENV";
import app from "./server";
import connectionToDb from "./config/db";
import setUpSocketIO from "./config/socketio";

// Initialize database connection
connectionToDb();

// For local development and persistent servers
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const server = http.createServer(app);
  
  // Initialize Socket.IO (Note: This will not work on Vercel)
  setUpSocketIO(server);

  server.listen(PORT || 9500, () => {
    console.log(`Server is running at http://localhost:${PORT || 9500}`);
  });
}

// Export the app for Vercel
export default app;
