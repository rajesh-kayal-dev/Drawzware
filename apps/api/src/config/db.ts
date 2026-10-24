import mongoose from 'mongoose';

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/drawzware';
  try {
    const conn = await mongoose.connect(mongoUri);
    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('MongoDB disconnect error:', error);
  }
}
