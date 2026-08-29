// apps/api/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto, GoogleLoginDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, CurrentUserPayload } from '@/platform/rbac/decorators/current-user.decorator';

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

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile & permissions' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.userId);
  }
}
