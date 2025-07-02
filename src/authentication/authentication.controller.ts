import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';
import { LoggedInUser } from './decorators/get-current-user';
import { User } from './entities/users.entity';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('/register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description:
      'User successfully registered. Refresh token is set in HTTP-only cookie.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authenticationService.register(registerDto);

    // Set refresh token in an HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refresh_token);

    // Return only the access token
    return { access_token: result.access_token };
  }

  @Post('/login')
  @ApiOperation({ summary: 'Login and get an access token' })
  @ApiResponse({
    status: 200,
    description: 'Successful login. Refresh token is set in HTTP-only cookie.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authenticationService.login(loginDto);

    // Set refresh token in an HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refresh_token);

    // Return only the access token
    return { access_token: result.access_token };
  }

  @Post('/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh token' })
  @ApiResponse({
    status: 200,
    description:
      'Return the new access token and updates refresh token in HTTP-only cookie.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid refresh token.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token not found in cookies.',
  })
  @ApiResponse({ status: 404, description: 'User is not logged in.' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Get refresh token from cookies
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authenticationService.refreshToken(refreshToken);

    // Set new refresh token in an HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refresh_token);

    // Return only the access token
    return { access_token: result.access_token };
  }

  @Post('/logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'logout' })
  @ApiResponse({ status: 404, description: 'user is not logged in.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Get refresh token from cookies
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authenticationService.logout(refreshToken);

    // Clear the refresh token cookie
    response.clearCookie('refresh_token');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('/me')
  @HttpCode(200)
  @ApiOperation({ summary: 'logout' })
  @ApiResponse({ status: 404, description: 'user is not logged in.' })
  async getUserInfo(@LoggedInUser() user: Partial<User>) {
    return this.authenticationService.getUserInfo(user.id);
  }
}
