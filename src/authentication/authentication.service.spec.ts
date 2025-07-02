import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repository/user.repository';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/users.entity';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsRepository } from './repository/sessions.repository';
import { ConfigModule } from '@nestjs/config';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userRepository: jest.Mocked<UserRepository>;
  let sessionRepository: jest.Mocked<SessionsRepository>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        ConfigModule,
      ],
      providers: [
        AuthenticationService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: SessionsRepository,
          useValue: {
            create: jest.fn(),
            deleteExpiredSessions: jest.fn(),
            deleteByUserId: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mocked-jwt-token'),
          },
        },
      ],
      exports: [AuthenticationService],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    userRepository = module.get(UserRepository);
    sessionRepository = module.get(SessionsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const mockRegisterDto: RegisterDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'P@ssword123',
    };

    it('should register a new user and return a JWT token', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue({
        _id: '12345',
        name: mockRegisterDto.name,
        email: mockRegisterDto.email,
        password: await bcrypt.hash(mockRegisterDto.password, 12),
      } as User);

      const result = await service.register(mockRegisterDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        mockRegisterDto.email,
      );
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockRegisterDto.name,
          email: mockRegisterDto.email,
        }),
      );

      expect(result).toEqual({
        access_token: 'mocked-jwt-token',
        refresh_token: 'mocked-jwt-token',
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue({
        _id: 'existing-id',
        name: mockRegisterDto.name,
        email: mockRegisterDto.email,
        password: await bcrypt.hash(mockRegisterDto.password, 12),
      } as User);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest
        .spyOn(userRepository, 'create')
        .mockRejectedValue(new Error('DB Error'));

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    const mockUser: User = {
      _id: '12345',
      name: 'John Doe',
      email: 'john@example.com',
      password: '$2b$12$hashedpassword',
    } as User;

    it('should login user and return JWT token', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(sessionRepository, 'create').mockResolvedValue({
        token: 'mocked-jwt-token',
        user: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.login({
        email: mockUser.email,
        password: 'P@ssword123',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(result).toEqual({
        access_token: 'mocked-jwt-token',
        refresh_token: 'mocked-jwt-token',
      });
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

      await expect(
        service.login({ email: mockUser.email, password: 'P@ssword123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        service.login({ email: mockUser.email, password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
