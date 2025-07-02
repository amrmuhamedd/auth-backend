import { Controller, Post, Body, HttpCode, UseGuards, Res, Req } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';

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
    description: 'User successfully registered. Refresh token is set in HTTP-only cookie.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authenticationService.register(registerDto);
    
    // Set refresh token in an HTTP-only cookie
    this.setRefreshTokenCookie(response, result.refresh_token);
    
    // Return only the access token
    return { access_token: result.access_token };
  }
}
