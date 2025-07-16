import { DataSource } from "typeorm";
import { Domain } from "../entities/Domain";
import { ExpectedDnsRecord } from "../entities/ExpectedDnsRecord";
import { DnsCheckHistory } from "../entities/DnsCheckHistory";
import { RetrievedDnsRecord } from "../entities/RetrievedDnsRecord";
import { User } from "../entities/User";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.PGHOST,
    port: 5432,
    username: process.env.PGUSER,
    password: process.env.PGPASS,
    database: process.env.PGDATABASE,
    ssl: {
        rejectUnauthorized: false
    },
    entities: [Domain, ExpectedDnsRecord, DnsCheckHistory, RetrievedDnsRecord, User],
    synchronize: false, // Set to false in production
    logging: true,
});
