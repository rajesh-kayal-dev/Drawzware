import "dotenv/config";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { validateEnvironment } from "./config/env.js";

const PORT = process.env.PORT || 3000;

export { validateEnvironment };

async function startServer() {
  validateEnvironment();
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
