import mongoose from "mongoose";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = `mongodb+srv://${process.env.MONGO_USER_NAME}:${process.env.MONGO_USER_PASSWORD}@brief.5qwlb.mongodb.net/Brief?retryWrites=true&w=majority&appName=brief`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const connectDB = async () => {
  try {
    // Connect with MongoClient first to test connection
    await client.connect();
    await client.db("Brief").command({ ping: 1 });
    console.log("Pinged your deployment. Successfully connected to Brief database!");
    
    // Then connect with Mongoose for the application
    await mongoose.connect(uri, {
      dbName: 'Brief',
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    console.log('Connected to Brief database Successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  } finally {
    // Close the MongoClient connection after testing
    await client.close();
  }
};

export default connectDB; 