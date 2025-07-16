import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UserService } from '../services/UserService';

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
    };
}

// Authentication middleware
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Check for Authorization header (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            const userService = new UserService();
            const user = await userService.getUserFromToken(token);

            if (user) {
                req.user = {
                    id: user.id,
                    username: user.username,
                    role: user.role
                };
                return next();
            }
        } catch (error) {
            console.error('Error validating token:', error);
        }
    }

    // Fallback to old API key method for backward compatibility
    if (apiKey) {
        const validApiKey = process.env.API_KEY || 'your-api-key';

        if (apiKey === validApiKey) {
            req.user = { id: 0, username: 'API User', role: 'admin' };
            return next();
        }
    }

    // If no valid authentication found
    return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Authorization header (Bearer token) or X-API-Key header'
    });
};

// Optional: Basic auth middleware
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide Basic authentication credentials'
        });
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const validUsername = process.env.BASIC_AUTH_USERNAME || 'admin';
    const validPassword = process.env.BASIC_AUTH_PASSWORD || 'password';

    if (username === validUsername && password === validPassword) {
        return next();
    }

    return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
    });
};

// Rate limiting middleware (optional)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const now = Date.now();

        const clientData = requestCounts.get(clientId as string);

        if (!clientData || now > clientData.resetTime) {
            // Reset or create new entry
            requestCounts.set(clientId as string, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        if (clientData.count >= maxRequests) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`
            });
        }

        clientData.count++;
        next();
    };
};

export { AuthenticatedRequest };
