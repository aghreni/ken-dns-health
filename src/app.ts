import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { DnsChecker } from "./services/DnsChecker";
import { DomainService } from "./services/DomainService";
import { DnsValidationService } from "./services/DnsValidationService";
import { authenticate, rateLimit, AuthenticatedRequest } from "./middleware/auth";
import { UserService } from "./services/UserService";

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/check-dns", authenticate, async (req: AuthenticatedRequest, res) => {
    const domain = req.query.domain as string;

    if (!domain) {
        return res.status(400).json({ error: "No domain provided" });
    }

    const checker = new DnsChecker(domain);
    const results = await checker.checkAll();
    res.json(results);
});

// Get all domains from database
app.get("/domains", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const domainService = new DomainService();
        const domains = await domainService.getAllDomains(req.user!.id);
        res.json({ domains, count: domains.length });
    } catch (error) {
        console.error("Error fetching domains:", error);
        res.status(500).json({ error: "Failed to fetch domains" });
    }
});

// Get only domain names
app.get("/domain-names", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const domainService = new DomainService();
        const domainNames = await domainService.getDomainNames(req.user!.id);
        res.json({ domainNames, count: domainNames.length });
    } catch (error) {
        console.error("Error fetching domain names:", error);
        res.status(500).json({ error: "Failed to fetch domain names" });
    }
});

// Check DNS for all domains in database
app.get("/check-all-dns", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const domainService = new DomainService();
        const domainNames = await domainService.getDomainNames(req.user!.id);

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
app.get("/validate-all-dns", authenticate, async (req: AuthenticatedRequest, res) => {
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
app.get("/dns-check-history", authenticate, async (req: AuthenticatedRequest, res) => {
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
app.get("/retrieved-dns-records", authenticate, async (req: AuthenticatedRequest, res) => {
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

// Add domain without expected DNS record
app.post("/domain", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const { domain } = req.body;

        // Validate required fields
        if (!domain) {
            return res.status(400).json({
                error: "Missing required field: domain is required"
            });
        }

        // Validate domain name format (basic validation)
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return res.status(400).json({
                error: "Invalid domain name format"
            });
        }

        const domainService = new DomainService();
        const result = await domainService.createDomain(domain, req.user!.id);

        res.status(201).json({
            message: "Domain added successfully",
            domain: {
                id: result.id,
                name: result.name,
                created_at: result.created_at,
                updated_at: result.updated_at
            }
        });
    } catch (error) {
        console.error("Error adding domain:", error);
        res.status(500).json({ error: "Failed to add domain" });
    }
});

// Add domain with expected DNS record
app.put("/domain-with-expected-record", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const { domain, record_type, record_value } = req.body;

        // Validate required fields
        if (!domain || !record_type || !record_value) {
            return res.status(400).json({
                error: "Missing required fields: domain, record_type, and record_value are required"
            });
        }

        // Validate record_type (basic validation)
        const validRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SRV', 'PTR', 'SPF', 'DKIM', 'DMARC'];
        if (!validRecordTypes.includes(record_type.toUpperCase())) {
            return res.status(400).json({
                error: `Invalid record_type. Must be one of: ${validRecordTypes.join(', ')}`
            });
        }

        // Validate domain name format (basic validation)
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return res.status(400).json({
                error: "Invalid domain name format"
            });
        }

        const domainService = new DomainService();
        const result = await domainService.addDomainWithExpectedRecord(domain, record_type, record_value, req.user!.id);

        res.json({
            message: "Domain and expected DNS record added successfully",
            domain: {
                id: result.domain.id,
                name: result.domain.name,
                created_at: result.domain.created_at,
                updated_at: result.domain.updated_at
            },
            expected_record: {
                id: result.expectedRecord.id,
                domain_id: result.expectedRecord.domain_id,
                record_type: result.expectedRecord.record_type,
                record_value: result.expectedRecord.record_value
            }
        });
    } catch (error) {
        console.error("Error adding domain with expected record:", error);
        res.status(500).json({ error: "Failed to add domain with expected record" });
    }
});

// User authentication endpoints
app.post("/auth/register", async (req: AuthenticatedRequest, res) => {
    try {
        const { username, password, role } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                error: "Missing required fields: username and password are required"
            });
        }

        // Validate username format
        const usernameRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                error: "Invalid email format. Please enter a valid email address."
            });
        }

        // Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters long"
            });
        }

        const userService = new UserService();
        const user = await userService.createUser(username, password, role || 'user');

        res.status(201).json({
            message: "User created successfully",
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error("Error creating user:", error);
        if (error instanceof Error && error.message === 'Username already exists') {
            return res.status(409).json({ error: "Username already exists" });
        }
        res.status(500).json({ error: "Failed to create user" });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                error: "Missing required fields: username and password are required"
            });
        }

        const userService = new UserService();
        const user = await userService.validateUser(username, password);

        if (!user) {
            return res.status(401).json({
                error: "Invalid credentials"
            });
        }

        // Generate token
        const token = userService.generateToken(user);

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

app.get("/auth/me", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        res.json({
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

app.get("/users", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        // Only admin users can list all users
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }

        const userService = new UserService();
        const users = await userService.getAllUsers();
        res.json({ users, count: users.length });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

export default app;
