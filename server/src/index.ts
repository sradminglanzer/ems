import app from './app';
import { connectDB } from './config/db';
import { initExpiryAlertJob } from './jobs/expiry-alert.job';
import dotenv from 'dotenv';

dotenv.config({ path: `.${process.env.N_ENV}.env` });

const PORT = process.env.PORT || 5001;

const startServer = async () => {
    await connectDB();
    initExpiryAlertJob();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
