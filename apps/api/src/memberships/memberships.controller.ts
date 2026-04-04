import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  CreateCourseDto, UpdateCourseDto, CreateModuleDto, CreateLessonDto,
  UpdateLessonProgressDto, EnrollDto,
} from './dto/membership.dto';

@ApiTags('Memberships & Courses')
@ApiBearerAuth('access-token')
@Controller('courses')
export class MembershipsController {
  constructor(private membershipsService: MembershipsService) {}

  @Post()
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Create a course' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateCourseDto) {
    return this.membershipsService.createCourse(tenantId, dto);
  }

  @Get()
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List courses' })
  async list(@CurrentTenant() tenantId: string, @Query() query: Record<string, string>) {
    return this.membershipsService.listCourses(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get course with modules and lessons' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.membershipsService.findCourse(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.membershipsService.updateCourse(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payments:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course (soft delete)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.membershipsService.deleteCourse(tenantId, id);
  }

  @Post(':id/modules')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Add a module to a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async addModule(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CreateModuleDto) {
    return this.membershipsService.addModule(tenantId, id, dto);
  }

  @Patch(':id/modules/:modId')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiParam({ name: 'modId', description: 'Module ID' })
  async updateModule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('modId') modId: string,
    @Body() body: any,
  ) {
    return this.membershipsService.updateModule(tenantId, id, modId, body);
  }

  @Post(':id/modules/:modId/lessons')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Add a lesson to a module' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiParam({ name: 'modId', description: 'Module ID' })
  async addLesson(
    @CurrentTenant() tenantId: string,
    @Param('id') courseId: string,
    @Param('modId') moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.membershipsService.addLesson(tenantId, courseId, moduleId, dto);
  }

  @Post(':id/enroll')
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Enroll a contact/user in a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async enroll(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: EnrollDto) {
    return this.membershipsService.enrollContact(tenantId, id, dto.contactId, dto.userId);
  }

  @Get(':id/enrollments')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List course enrollments' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  async listEnrollments(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.membershipsService.listEnrollments(tenantId, id, query);
  }
}

@ApiTags('Lessons')
@ApiBearerAuth('access-token')
@Controller('lessons')
export class LessonsController {
  constructor(private membershipsService: MembershipsService) {}

  @Patch(':id')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  async updateLesson(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.membershipsService.updateLesson(tenantId, id, body);
  }

  @Post(':id/progress')
  @RequirePermissions('payments:update')
  @ApiOperation({ summary: 'Update lesson progress' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  async updateProgress(
    @CurrentTenant() tenantId: string,
    @Param('id') lessonId: string,
    @Body() body: UpdateLessonProgressDto & { enrollmentId: string },
  ) {
    return this.membershipsService.updateLessonProgress(tenantId, lessonId, body.enrollmentId, body.status);
  }
}

@ApiTags('Enrollments')
@ApiBearerAuth('access-token')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private membershipsService: MembershipsService) {}

  @Get(':id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get enrollment with progress' })
  @ApiParam({ name: 'id', description: 'Enrollment ID' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.membershipsService.getEnrollment(tenantId, id);
  }
}
