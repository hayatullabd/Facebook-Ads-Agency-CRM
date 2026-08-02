import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log("MongoDB connected");
};
