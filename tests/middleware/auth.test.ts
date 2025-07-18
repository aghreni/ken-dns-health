import { authenticate, basicAuth, rateLimit } from '../../src/middleware/auth';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../src/services/UserService';

// Mock the UserService
jest.mock('../../src/services/UserService');
const mockUserService = UserService as jest.MockedClass<typeof UserService>;

describe('Authentication Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();

        // Set test environment variables
        process.env.API_TOKEN = 'test-secret-token';
        process.env.API_KEY = 'test-api-key';
        process.env.BASIC_AUTH_USERNAME = 'admin';
        process.env.BASIC_AUTH_PASSWORD = 'password123';

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('authenticate middleware', () => {
        it('should allow request with valid Bearer token', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                role: 'user',
                password_hash: 'hash',
                created_at: new Date(),
                updated_at: new Date()
            };
            mockUserService.prototype.getUserFromToken.mockResolvedValue(mockUser);

            mockRequest.headers = {
                authorization: 'Bearer test-secret-token'
            };

            await authenticate(mockRequest as any, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect((mockRequest as any).user).toEqual({
                id: mockUser.id,
                username: mockUser.username,
                role: mockUser.role
            });
        });

        it('should allow request with valid API key', async () => {
            mockRequest.headers = {
                'x-api-key': 'test-api-key'
            };

            await authenticate(mockRequest as any, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect((mockRequest as any).user).toEqual({ id: 0, username: 'API User', role: 'admin' });
        });

        it('should reject request with invalid Bearer token', async () => {
            mockUserService.prototype.getUserFromToken.mockResolvedValue(null);

            mockRequest.headers = {
                authorization: 'Bearer invalid-token'
            };

            await authenticate(mockRequest as any, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Authentication required',
                message: 'Please provide a valid Authorization header (Bearer token) or X-API-Key header'
            });
        });

        it('should reject request with invalid API key', () => {
            mockRequest.headers = {
                'x-api-key': 'invalid-api-key'
            };

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it('should reject request with no authentication', () => {
            mockRequest.headers = {};

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it('should reject request with malformed Bearer token', () => {
            mockRequest.headers = {
                authorization: 'InvalidFormat token'
            };

            authenticate(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe('basicAuth middleware', () => {
        it('should allow request with valid Basic auth credentials', () => {
            const credentials = Buffer.from('admin:password123').toString('base64');
            mockRequest.headers = {
                authorization: `Basic ${credentials}`
            };

            basicAuth(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should reject request with invalid Basic auth credentials', () => {
            const credentials = Buffer.from('admin:wrongpassword').toString('base64');
            mockRequest.headers = {
                authorization: `Basic ${credentials}`
            };

            basicAuth(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid credentials',
                message: 'Username or password is incorrect'
            });
        });

        it('should reject request with no Basic auth header', () => {
            mockRequest.headers = {};

            basicAuth(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Authentication required',
                message: 'Please provide Basic authentication credentials'
            });
        });

        it('should reject request with malformed Basic auth header', () => {
            mockRequest.headers = {
                authorization: 'Bearer token'
            };

            basicAuth(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe('rateLimit middleware', () => {
        it('should allow requests within rate limit', () => {
            const mockReq = {
                ...mockRequest,
                ip: '192.168.1.1'
            } as Request;

            const rateLimitMiddleware = rateLimit(5, 60000); // 5 requests per minute

            // First request should pass
            rateLimitMiddleware(mockReq, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should reject requests exceeding rate limit', () => {
            const mockReq = {
                ...mockRequest,
                ip: '192.168.1.2'
            } as Request;

            const rateLimitMiddleware = rateLimit(2, 60000); // 2 requests per minute

            // First two requests should pass
            rateLimitMiddleware(mockReq, mockResponse as Response, mockNext);
            rateLimitMiddleware(mockReq, mockResponse as Response, mockNext);

            // Third request should be rejected
            rateLimitMiddleware(mockReq, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(429);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Rate limit exceeded',
                message: 'Too many requests. Limit: 2 per 60 seconds'
            });
        });

        it('should handle requests without IP address', () => {
            const mockReq = {
                ...mockRequest,
                ip: undefined,
                headers: {}
            } as Request;

            const rateLimitMiddleware = rateLimit(5, 60000);

            rateLimitMiddleware(mockReq, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
