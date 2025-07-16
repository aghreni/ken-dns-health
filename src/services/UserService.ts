import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import crypto from 'crypto';

export class UserService {
    private userRepository: Repository<User>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
    }

    async createUser(username: string, password: string, role: string = 'user'): Promise<User> {
        try {
            // Check if user already exists
            const existingUser = await this.getUserByUsername(username);
            if (existingUser) {
                throw new Error('Username already exists');
            }

            // Hash password using MD5
            const passwordHash = crypto.createHash('md5').update(password).digest('hex');

            const user = this.userRepository.create({
                username,
                password_hash: passwordHash,
                role
            });

            return await this.userRepository.save(user);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getUserByUsername(username: string): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { username }
            });
        } catch (error) {
            console.error('Error fetching user by username:', error);
            throw new Error('Failed to fetch user from database');
        }
    }

    async getUserById(id: number): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { id }
            });
        } catch (error) {
            console.error('Error fetching user by id:', error);
            throw new Error('Failed to fetch user from database');
        }
    }

    async validateUser(username: string, password: string): Promise<User | null> {
        try {
            const user = await this.getUserByUsername(username);
            if (!user) {
                return null;
            }

            // Hash the provided password and compare
            const passwordHash = crypto.createHash('md5').update(password).digest('hex');
            if (user.password_hash === passwordHash) {
                return user;
            }

            return null;
        } catch (error) {
            console.error('Error validating user:', error);
            throw new Error('Failed to validate user');
        }
    }

    async getAllUsers(): Promise<User[]> {
        try {
            return await this.userRepository.find({
                select: ['id', 'username', 'role', 'created_at', 'updated_at']
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new Error('Failed to fetch users from database');
        }
    }

    // Generate a simple token (in production, use JWT or similar)
    generateToken(user: User): string {
        const payload = `${user.id}:${user.username}:${Date.now()}`;
        return Buffer.from(payload).toString('base64');
    }

    // Parse token and get user info
    async getUserFromToken(token: string): Promise<User | null> {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf8');
            const [userId] = decoded.split(':');

            if (!userId || isNaN(parseInt(userId))) {
                return null;
            }

            return await this.getUserById(parseInt(userId));
        } catch (error) {
            console.error('Error parsing token:', error);
            return null;
        }
    }
}
