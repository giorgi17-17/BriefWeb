import mongoose from "mongoose";
import { MongoClient, ServerApiVersion } from "mongodb";

const connectDB = async () => {
  try {
    const uri = `mongodb+srv://${process.env.MONGO_USER_NAME}:${process.env.MONGO_USER_PASSWORD}@brief.5qwlb.mongodb.net/Brief?retryWrites=true&w=majority&appName=brief`;

    console.log('Attempting to connect to MongoDB...');

    // Connect using Mongoose
    await mongoose.connect(uri, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });

    console.log('Connected to MongoDB Atlas successfully!');

    // Test connection with MongoClient
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connection test successful!");
    await client.close();

  } catch (error) {
    console.error('Detailed MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB; 