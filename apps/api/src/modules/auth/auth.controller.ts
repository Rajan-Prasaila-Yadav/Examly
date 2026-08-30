// apps/api/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto, GoogleLoginDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, CurrentUserPayload } from '../../platform/rbac/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with Email/Phone/ID and Password' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post('google')
  @ApiOperation({ summary: 'Sign in with Google OAuth 2.0' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  async googleLogin(@Body() dto: GoogleLoginDto, @Ip() ip: string) {
    return this.authService.googleLogin(dto, ip);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(@Body() dto: any, @Ip() ip: string) {
    return this.authService.register(dto, ip);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: { token: string; newPassword: string }) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile & permissions' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.userId);
  }

  @Post('onboarding')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete student details onboarding' })
  async updateOnboarding(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    return this.authService.updateOnboarding(user.userId, dto);
  }
}
