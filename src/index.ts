import express from "express";
import { DnsChecker } from "./services/DnsChecker";

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
    console.log(`DNS Checker API running at http://localhost:${PORT}`);
});
