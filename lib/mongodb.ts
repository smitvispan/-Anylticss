import mongoose from "mongoose";
import "@/models/User";
import "@/models/Subscription";
import "@/models/Plan";

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectWithUri(uri: string) {
  return mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  const primaryUri = process.env.MONGODB_URI || "";
  if (!primaryUri) {
    throw new Error("❌ Missing MONGODB_URI in environment variables");
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      try {
        return await connectWithUri(primaryUri);
      } catch (error) {
        cached.promise = null;

        const canUseLocalFallback =
          process.env.NODE_ENV !== "production" &&
          primaryUri.startsWith("mongodb+srv://");

        if (!canUseLocalFallback) {
          throw error;
        }

        const fallbackUri =
          process.env.MONGODB_URI_FALLBACK || "mongodb://127.0.0.1:27017/analytics";

        if (fallbackUri === primaryUri) {
          throw error;
        }

        console.warn(
          `[mongodb] Primary connection failed, falling back to local MongoDB at ${fallbackUri}.`,
          error
        );

        return connectWithUri(fallbackUri);
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
