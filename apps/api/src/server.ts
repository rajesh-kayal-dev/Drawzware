import "dotenv/config";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 3000;

export function validateEnvironment(): void {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.MONGO_URI) missing.push("MONGO_URI");

  if (missing.length > 0) {
    console.error(`[Fatal Startup Error] Missing required environment variable(s): ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function startServer() {
  validateEnvironment();
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
