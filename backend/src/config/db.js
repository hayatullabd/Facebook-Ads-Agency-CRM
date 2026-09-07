import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: !env.isProduction,
    maxPoolSize: 20,
    minPoolSize: 1,
    socketTimeoutMS: 45000,
  });

  console.log("MongoDB connected");
};
