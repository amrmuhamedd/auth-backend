import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { UserRepository } from './repository/user.repository';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { SessionsRepository } from './repository/sessions.repository';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authenticationService: AuthenticationService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret', // Provide a mock secret for testing
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthenticationController], // Register the controller here
      providers: [
        AuthenticationService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mocked-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'test-value'),
          },
        },
        {
          provide: SessionsRepository,
          useValue: {
            findByToken: jest.fn(),
            create: jest.fn(),
            deleteByToken: jest.fn(),
            deleteByUserId: jest.fn(),
            deleteExpiredSessions: jest.fn(),
          },
        },
        {
          provide: AuthenticationService,
          useValue: {
            register: jest.fn().mockResolvedValue({
              access_token: 'mocked-jwt-token',
              refresh_token: 'mocked-refresh-token',
            }),
            login: jest.fn().mockResolvedValue({
              access_token: 'mocked-jwt-token',
              refresh_token: 'mocked-refresh-token',
            }),
            refreshToken: jest.fn().mockResolvedValue({
              access_token: 'new-mocked-jwt-token',
              refresh_token: 'new-mocked-refresh-token',
            }),
            logout: jest
              .fn()
              .mockResolvedValue({ message: 'Logged out successfully' }),
            getUserInfo: jest
              .fn()
              .mockResolvedValue({ id: 'user-id', email: 'user@example.com' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authenticationService = module.get<AuthenticationService>(
      AuthenticationService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call AuthenticationService.register, set refresh token cookie and return access token', async () => {
      const registerDto: RegisterDto = {
        name: 'Amr',
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock response object with cookie method
      const mockResponse = {
        cookie: jest.fn(),
      };

      const result = await controller.register(
        registerDto,
        mockResponse as any,
      );

      expect(authenticationService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mocked-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      expect(result).toEqual({ access_token: 'mocked-jwt-token' });
    });
  });

  describe('login', () => {
    it('should call AuthenticationService.login, set refresh token cookie and return access token', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock response object with cookie method
      const mockResponse = {
        cookie: jest.fn(),
      };

      const result = await controller.login(loginDto, mockResponse as any);

      expect(authenticationService.login).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mocked-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      expect(result).toEqual({ access_token: 'mocked-jwt-token' });
    });
  });
});
