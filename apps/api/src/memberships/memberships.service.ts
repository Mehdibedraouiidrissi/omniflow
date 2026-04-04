import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

  async createCourse(tenantId: string, data: {
    name: string;
    description?: string;
    accessType?: string;
    thumbnailUrl?: string;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    return this.prisma.course.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        description: data.description,
        accessType: (data.accessType as any) || 'FREE',
        thumbnailUrl: data.thumbnailUrl,
        status: 'DRAFT',
      },
    });
  }

  async listCourses(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          _count: { select: { modules: true, enrollments: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findCourse(tenantId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: { orderBy: { position: 'asc' } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async updateCourse(tenantId: string, id: string, data: { name?: string; description?: string; status?: string; thumbnailUrl?: string }) {
    const course = await this.prisma.course.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(tenantId: string, id: string) {
    const course = await this.prisma.course.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addModule(tenantId: string, courseId: string, data: { name: string; description?: string; position: number }) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.courseModule.create({
      data: {
        tenantId,
        courseId,
        name: data.name,
        description: data.description,
        position: data.position,
      },
    });
  }

  async updateModule(tenantId: string, courseId: string, moduleId: string, data: { name?: string; description?: string; position?: number }) {
    const mod = await this.prisma.courseModule.findFirst({ where: { id: moduleId, courseId, tenantId } });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.courseModule.update({ where: { id: moduleId }, data });
  }

  async addLesson(tenantId: string, courseId: string, moduleId: string, data: {
    name: string;
    contentType: string;
    content?: Record<string, unknown>;
    videoUrl?: string;
    duration?: number;
    position: number;
  }) {
    return this.prisma.lesson.create({
      data: {
        tenantId,
        courseId,
        moduleId,
        name: data.name,
        contentType: data.contentType as any,
        content: data.content || {},
        videoUrl: data.videoUrl,
        duration: data.duration,
        position: data.position,
      },
    });
  }

  async updateLesson(tenantId: string, lessonId: string, data: Record<string, unknown>) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, tenantId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return this.prisma.lesson.update({ where: { id: lessonId }, data });
  }

  async enrollContact(tenantId: string, courseId: string, contactId: string, userId?: string) {
    // Check if already enrolled
    const existing = await this.prisma.enrollment.findFirst({
      where: { courseId, contactId },
    });
    if (existing) throw new BadRequestException('Contact is already enrolled');

    const enrollment = await this.prisma.enrollment.create({
      data: {
        tenantId,
        courseId,
        contactId,
        userId,
        status: 'ACTIVE',
        enrolledAt: new Date(),
      },
    });

    // Increment course enrollment count
    await this.prisma.course.update({
      where: { id: courseId },
      data: { enrollmentCount: { increment: 1 } },
    });

    return enrollment;
  }

  async listEnrollments(tenantId: string, courseId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { tenantId, courseId },
        skip: params.skip,
        take: params.limit,
        orderBy: { enrolledAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.enrollment.count({ where: { tenantId, courseId } }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async updateLessonProgress(tenantId: string, lessonId: string, enrollmentId: string, status: string) {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id: enrollmentId, tenantId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const progress = await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      update: {
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
      create: {
        tenantId,
        enrollmentId,
        lessonId,
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    // Check overall course completion
    if (status === 'COMPLETED') {
      const course = await this.prisma.course.findFirst({
        where: { id: enrollment.courseId },
        include: { lessons: { select: { id: true } } },
      });
      if (course) {
        const completedCount = await this.prisma.lessonProgress.count({
          where: { enrollmentId, status: 'COMPLETED' },
        });
        if (completedCount >= course.lessons.length) {
          await this.prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        }
      }
    }

    return progress;
  }

  async getEnrollment(tenantId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: {
          include: {
            modules: {
              orderBy: { position: 'asc' },
              include: { lessons: { orderBy: { position: 'asc' } } },
            },
          },
        },
        lessonProgresses: true,
      },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const totalLessons = enrollment.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = enrollment.lessonProgresses.filter((p) => p.status === 'COMPLETED').length;

    return {
      ...enrollment,
      progress: {
        totalLessons,
        completedLessons,
        percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    };
  }
}
