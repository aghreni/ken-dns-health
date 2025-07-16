import "reflect-metadata";
import app from "./app";
import { AppDataSource } from "./config/database";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize database connection
AppDataSource.initialize()
    .then(() => {
        console.log("Database connection established successfully");

        app.listen(PORT, () => {
            console.log(`DNS Checker API running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Error during database initialization:", error);
        process.exit(1);
    });
