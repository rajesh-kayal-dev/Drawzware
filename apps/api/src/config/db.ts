import mongoose from "mongoose";

export function sanitizeMongoUri(uri: string): string {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeMongoUri(error.message);
  }
  return sanitizeMongoUri(String(error));
}

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI!;
    await mongoose.connect(uri);
    console.log(`MongoDB connected`);
  } catch (error) {
    console.error("MongoDB connection failed:", sanitizeError(error));
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error("MongoDB disconnect error:", sanitizeError(error));
  }
}
