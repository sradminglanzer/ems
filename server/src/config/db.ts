import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: `.${process.env.N_ENV}.env` });
console.log('Environment ', process.env);

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems';
const client = new MongoClient(uri);

let db: Db;

export const connectDB = async () => {
    try {
        await client.connect();
        db = client.db(process.env.DB_NAME);
        console.log('Successfully connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
};

export const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
};
