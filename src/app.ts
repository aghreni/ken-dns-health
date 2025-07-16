import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { DnsChecker } from "./services/DnsChecker";
import { DomainService } from "./services/DomainService";
import { DnsValidationService } from "./services/DnsValidationService";

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get("/check-dns", async (req, res) => {
    const domain = req.query.domain as string;

    if (!domain) {
        return res.status(400).json({ error: "No domain provided" });
    }

    const checker = new DnsChecker(domain);
    const results = await checker.checkAll();
    res.json(results);
});

// Get all domains from database
app.get("/domains", async (req, res) => {
    try {
        const domainService = new DomainService();
        const domains = await domainService.getAllDomains();
        res.json({ domains, count: domains.length });
    } catch (error) {
        console.error("Error fetching domains:", error);
        res.status(500).json({ error: "Failed to fetch domains" });
    }
});

// Get only domain names
app.get("/domain-names", async (req, res) => {
    try {
        const domainService = new DomainService();
        const domainNames = await domainService.getDomainNames();
        res.json({ domainNames, count: domainNames.length });
    } catch (error) {
        console.error("Error fetching domain names:", error);
        res.status(500).json({ error: "Failed to fetch domain names" });
    }
});

// Check DNS for all domains in database
app.get("/check-all-dns", async (req, res) => {
    try {
        const domainService = new DomainService();
        const domainNames = await domainService.getDomainNames();

        const results = [];
        for (const domain of domainNames) {
            try {
                const checker = new DnsChecker(domain);
                const dnsResult = await checker.checkAll();
                results.push({
                    domain,
                    status: 'success',
                    data: dnsResult
                });
            } catch (error) {
                results.push({
                    domain,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        res.json({
            totalDomains: domainNames.length,
            results
        });
    } catch (error) {
        console.error("Error checking DNS for all domains:", error);
        res.status(500).json({ error: "Failed to check DNS for all domains" });
    }
});

// Validate DNS for all domains against expected records
app.get("/validate-all-dns", async (req, res) => {
    try {
        const dnsValidationService = new DnsValidationService();
        const results = await dnsValidationService.validateAllDomains();
        res.json(results);
    } catch (error) {
        console.error("Error validating DNS for all domains:", error);
        res.status(500).json({ error: "Failed to validate DNS for all domains" });
    }
});

// Get DNS check history
app.get("/dns-check-history", async (req, res) => {
    try {
        const domainId = req.query.domain_id ? parseInt(req.query.domain_id as string) : undefined;
        const dnsValidationService = new DnsValidationService();
        const history = await dnsValidationService.getDnsCheckHistory(domainId);
        res.json({ history, count: history.length });
    } catch (error) {
        console.error("Error fetching DNS check history:", error);
        res.status(500).json({ error: "Failed to fetch DNS check history" });
    }
});

// Get retrieved DNS records for a specific check
app.get("/retrieved-dns-records", async (req, res) => {
    try {
        const checkId = req.query.check_id ? parseInt(req.query.check_id as string) : undefined;

        if (!checkId) {
            return res.status(400).json({ error: "check_id parameter is required" });
        }

        const dnsValidationService = new DnsValidationService();
        const records = await dnsValidationService.getRetrievedDnsRecords(checkId);
        res.json({ records, count: records.length });
    } catch (error) {
        console.error("Error fetching retrieved DNS records:", error);
        res.status(500).json({ error: "Failed to fetch retrieved DNS records" });
    }
});

export default app;
