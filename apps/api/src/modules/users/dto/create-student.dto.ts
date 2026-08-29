// apps/api/src/modules/users/dto/create-student.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+9779876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false, example: 'aarav@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '12A-034' })
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @ApiProperty({ required: false, example: 'batch-cee-2026-a' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ required: false, example: 'Bagmati' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ required: false, example: 'Kathmandu' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false, example: 'Kathmandu Metropolitan City' })
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiProperty({ required: false, example: '04' })
  @IsOptional()
  @IsString()
  wardNumber?: string;

  @ApiProperty({ required: false, example: '+9779876512345' })
  @IsOptional()
  @IsString()
  parentPhone?: string;

  @ApiProperty({ required: false, example: 'TempPass@123' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class CreateTeacherDto {
  @ApiProperty({ example: 'Dr. Arun Mehta' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+9779822222222' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'arun.mehta@apexmedical.edu.np' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'TCH-014' })
  @IsString()
  @IsNotEmpty()
  facultyCode: string;

  @ApiProperty({ example: 'Senior Physics Faculty' })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({ example: ['Mechanics', 'Thermodynamics'] })
  @IsArray()
  @IsOptional()
  specialization?: string[];

  @ApiProperty({ example: ['batch-cee-2026-a'] })
  @IsArray()
  @IsOptional()
  assignedBatchIds?: string[];

  @ApiProperty({ required: false, example: 'TeacherPass@123' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ example: 'BLOCKED', enum: ['ACTIVE', 'BLOCKED', 'LOCKED', 'DELETED'] })
  @IsString()
  @IsNotEmpty()
  status: 'ACTIVE' | 'BLOCKED' | 'LOCKED' | 'DELETED';
}

export class UpdateTeacherPermissionsDto {
  @ApiProperty({
    example: [
      { resource: 'tests', action: 'create', isAllowed: true },
      { resource: 'videos', action: 'create', isAllowed: true },
      { resource: 'students', action: 'read', isAllowed: true },
    ],
  })
  @IsArray()
  permissions: { resource: string; action: string; isAllowed: boolean }[];
}
