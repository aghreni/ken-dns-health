import dns from "dns/promises";

export class DnsChecker {
    constructor(private domain: string) { }

    async getA() {
        try {
            return await dns.resolve4(this.domain);
        } catch {
            return [];
        }
    }

    async getAAAA() {
        try {
            return await dns.resolve6(this.domain);
        } catch {
            return [];
        }
    }

    async getCNAME() {
        try {
            return await dns.resolveCname(this.domain);
        } catch {
            return [];
        }
    }

    async getMX() {
        try {
            return await dns.resolveMx(this.domain);
        } catch {
            return [];
        }
    }

    async getTXT() {
        try {
            return await dns.resolveTxt(this.domain);
        } catch {
            return [];
        }
    }

    async getNS() {
        try {
            return await dns.resolveNs(this.domain);
        } catch {
            return [];
        }
    }

    async getSOA() {
        try {
            return await dns.resolveSoa(this.domain);
        } catch {
            return null;
        }
    }

    async getSRV() {
        return dns.resolveSrv(`_sip._tcp.${this.domain}`).catch(() => []);
    }

    async getPTR() {
        try {
            const aRecords = await this.getA();
            if (aRecords.length > 0) {
                return await dns.reverse(aRecords[0]);
            }
        } catch {
            return [];
        }
        return [];
    }


    async getSPF() {
        try {
            const txt = await this.getTXT();
            return txt.flat().filter((record) => record.startsWith("v=spf1"));
        } catch {
            try {
                const fallback = await dns.resolveTxt(this.domain.split('.').slice(-2).join('.'));
                return fallback.flat().filter((record) => record.startsWith("v=spf1"));
            } catch {
                return [];
            }
        }
    }


    async getDKIM() {
        // Common DKIM selectors to try
        const commonSelectors = ["default", "google", "selector1", "selector2", "k1", "dkim", "mail"];
        const results = [];

        for (const selector of commonSelectors) {
            try {
                const dkimRecord = await dns.resolveTxt(`${selector}._domainkey.${this.domain}`);
                if (dkimRecord && dkimRecord.length > 0) {
                    results.push({
                        selector: selector,
                        record: dkimRecord.flat()
                    });
                }
            } catch {
                // Continue to next selector if this one fails
                continue;
            }
        }

        return results;
    }

    async getDMARC() {
        try {
            const dmarcRecord = await dns.resolveTxt(`_dmarc.${this.domain}`);
            return dmarcRecord.flat().filter((record) => record.startsWith("v=DMARC1"));
        } catch {
            return [];
        }
    }

    async checkAll() {
        return {
            A: await this.getA(),
            AAAA: await this.getAAAA(),
            CNAME: await this.getCNAME(),
            MX: await this.getMX(),
            TXT: await this.getTXT(),
            NS: await this.getNS(),
            SOA: await this.getSOA(),
            SRV: await this.getSRV(),
            PTR: await this.getPTR(),
            SPF: await this.getSPF(),
            DKIM: await this.getDKIM(),
            DMARC: await this.getDMARC()
        };
    }
}
