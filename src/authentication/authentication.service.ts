import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UserRepository } from './repository/user.repository';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SessionsRepository } from './repository/sessions.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);
  private readonly saltRounds = 12;
  private readonly EXPIRATION_TIME = 60 * 60 * 1000; // 10 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionsRepository,
  ) {}

  async getUserInfo(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async login(loginData: LoginDto) {
    const { email, password } = loginData;

    // Validate user credentials
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.sessionRepository.deleteExpiredSessions(
      user.id,
      this.EXPIRATION_TIME,
    );

    const refresh_token = this.generateRefreshToken(user.id);
    const access_token = this.generateToken(user.id);

    await this.sessionRepository.deleteByUserId(user.id);

    await this.sessionRepository.create({
      user: user,
      token: refresh_token,
    });

    return { access_token, refresh_token };
  }

  private async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async logout(refreshToken: string) {
    const session = await this.sessionRepository.findByToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid session or already logged out');
    }

    await this.sessionRepository.deleteByToken(refreshToken);
    this.logger.log('User logged out successfully');
    return { message: 'Logged out successfully' };
  }

  async register(data: RegisterDto) {
    this.logger.log(`Registering new user with email: ${data.email}`);

    await this.ensureUserDoesNotExist(data.email);
    const hashedPassword = await this.hashPassword(data.password);

    try {
      const createdUser = await this.userRepository.create({
        name: data.name,
        email: data.email,
        password: hashedPassword,
      });
      const refresh_token = this.generateRefreshToken(createdUser.id);
      const access_token = this.generateToken(createdUser.id);

      await this.sessionRepository.create({
        user: createdUser,
        token: refresh_token,
      });

      this.logger.log(`User created successfully: ${createdUser.id}`);

      return {
        access_token,
        refresh_token,
      };
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Error creating user. Please try again later.',
      );
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is required');
      }

      const session = await this.sessionRepository.findByToken(refreshToken);
      if (!session) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      let decoded;
      try {
        decoded = this.jwtService.verify(refreshToken, {
          secret: this.configService.get<string>('RT_SECRET'),
        });
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Refresh token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('Invalid refresh token');
        }
        throw new InternalServerErrorException('Token verification failed');
      }

      console.log('Decoded Token:', decoded);

      const user = await this.userRepository.findById(decoded.id);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessToken = this.generateToken(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id);

      await this.sessionRepository.deleteByUserId(user.id);
      await this.sessionRepository.create({ user, token: newRefreshToken });

      return { access_token: newAccessToken, refresh_token: newRefreshToken };
    } catch (error) {
      this.logger.error('Refresh Token Error:', error);
      throw error instanceof UnauthorizedException ||
        error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('An unexpected error occurred');
    }
  }

  private async ensureUserDoesNotExist(email: string) {
    this.logger.debug(`Checking if user exists with email: ${email}`);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      this.logger.warn(`User with email ${email} already exists.`);
      throw new BadRequestException('User already exists.');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    this.logger.debug('Hashing user password.');
    return await bcrypt.hash(password, this.saltRounds);
  }

  private generateToken(id: string): string {
    this.logger.debug(`Generating JWT token for user ID: ${id}`);
    return this.jwtService.sign(
      { id },
      { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '1h' },
    );
  }

  private generateRefreshToken(userId: string): string {
    this.logger.debug(`Generating refresh token for user ID: ${userId}`);
    return this.jwtService.sign(
      { id: userId },
      { secret: this.configService.get<string>('RT_SECRET'), expiresIn: '7d' },
    );
  }
}
