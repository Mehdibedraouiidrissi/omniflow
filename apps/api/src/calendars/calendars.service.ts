import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class CalendarsService {
  constructor(private prisma: PrismaService) {}

  async createCalendar(tenantId: string, userId: string, data: {
    name: string;
    type?: string;
    description?: string;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    const calendar = await this.prisma.calendar.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        type: (data.type as any) || 'PERSONAL',
        description: data.description,
      },
    });

    await this.prisma.calendarMember.create({
      data: { calendarId: calendar.id, userId, priority: 0 },
    });

    return calendar;
  }

  async listCalendars(tenantId: string, userId: string) {
    return this.prisma.calendar.findMany({
      where: { tenantId, members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        _count: { select: { meetingTypes: true, appointments: true } },
      },
    });
  }

  async findCalendar(tenantId: string, id: string) {
    const calendar = await this.prisma.calendar.findFirst({
      where: { id, tenantId },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        availabilityRules: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { meetingTypes: true, appointments: true } },
      },
    });
    if (!calendar) throw new NotFoundException('Calendar not found');
    return calendar;
  }

  async updateCalendar(tenantId: string, id: string, data: { name?: string; description?: string; timezone?: string; isActive?: boolean }) {
    const calendar = await this.prisma.calendar.findFirst({ where: { id, tenantId } });
    if (!calendar) throw new NotFoundException('Calendar not found');

    return this.prisma.calendar.update({ where: { id }, data });
  }

  async deleteCalendar(tenantId: string, id: string) {
    const calendar = await this.prisma.calendar.findFirst({ where: { id, tenantId } });
    if (!calendar) throw new NotFoundException('Calendar not found');

    return this.prisma.calendar.delete({ where: { id } });
  }

  // --- Availability ---

  async setAvailability(tenantId: string, calendarId: string, rules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }>) {
    // Delete existing rules
    await this.prisma.availabilityRule.deleteMany({ where: { calendarId, tenantId } });

    // Create new rules
    await this.prisma.availabilityRule.createMany({
      data: rules.map((rule) => ({
        tenantId,
        calendarId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isActive: rule.isActive !== false,
      })),
    });

    return this.prisma.availabilityRule.findMany({
      where: { calendarId, tenantId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // --- Meeting Types ---

  async createMeetingType(tenantId: string, calendarId: string, data: {
    name: string;
    duration: number;
    description?: string;
    color?: string;
    bufferBefore?: number;
    bufferAfter?: number;
    maxBookingsPerDay?: number;
    requiresConfirmation?: boolean;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    return this.prisma.meetingType.create({
      data: {
        tenantId,
        calendarId,
        name: data.name,
        slug,
        duration: data.duration,
        description: data.description,
        color: data.color,
        bufferBefore: data.bufferBefore || 0,
        bufferAfter: data.bufferAfter || 0,
        maxBookingsPerDay: data.maxBookingsPerDay,
        requiresConfirmation: data.requiresConfirmation || false,
      },
    });
  }

  async listMeetingTypes(tenantId: string, calendarId: string) {
    return this.prisma.meetingType.findMany({
      where: { tenantId, calendarId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMeetingType(tenantId: string, calendarId: string, meetingTypeId: string, data: Record<string, unknown>) {
    const mt = await this.prisma.meetingType.findFirst({ where: { id: meetingTypeId, calendarId, tenantId } });
    if (!mt) throw new NotFoundException('Meeting type not found');

    return this.prisma.meetingType.update({ where: { id: meetingTypeId }, data });
  }

  // --- Available Slots ---

  async getAvailableSlots(tenantId: string, calendarId: string, query: { startDate: string; endDate: string; meetingTypeId?: string }) {
    const calendar = await this.prisma.calendar.findFirst({
      where: { id: calendarId, tenantId },
      include: { availabilityRules: { where: { isActive: true } } },
    });
    if (!calendar) throw new NotFoundException('Calendar not found');

    let duration = 30; // default 30 min
    let bufferBefore = 0;
    let bufferAfter = 0;

    if (query.meetingTypeId) {
      const mt = await this.prisma.meetingType.findFirst({ where: { id: query.meetingTypeId } });
      if (mt) {
        duration = mt.duration;
        bufferBefore = mt.bufferBefore;
        bufferAfter = mt.bufferAfter;
      }
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Get existing appointments
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        calendarId,
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        startTime: { gte: startDate, lte: endDate },
      },
      select: { startTime: true, endTime: true },
    });

    const slots: Array<{ date: string; startTime: string; endTime: string }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dayRules = calendar.availabilityRules.filter((r) => r.dayOfWeek === dayOfWeek);

      for (const rule of dayRules) {
        const [startH, startM] = rule.startTime.split(':').map(Number);
        const [endH, endM] = rule.endTime.split(':').map(Number);

        const slotStart = new Date(current);
        slotStart.setHours(startH!, startM!, 0, 0);

        const windowEnd = new Date(current);
        windowEnd.setHours(endH!, endM!, 0, 0);

        while (slotStart.getTime() + (duration + bufferAfter) * 60000 <= windowEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);
          const bufferedStart = new Date(slotStart.getTime() - bufferBefore * 60000);
          const bufferedEnd = new Date(slotEnd.getTime() + bufferAfter * 60000);

          // Check conflicts
          const hasConflict = existingAppointments.some((appt) =>
            bufferedStart < appt.endTime && bufferedEnd > appt.startTime,
          );

          if (!hasConflict && slotStart > new Date()) {
            slots.push({
              date: current.toISOString().split('T')[0]!,
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
            });
          }

          slotStart.setTime(slotStart.getTime() + (duration + bufferAfter) * 60000);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  // --- Appointments ---

  async bookAppointment(tenantId: string, data: {
    calendarId: string;
    meetingTypeId: string;
    contactId: string;
    assigneeId?: string;
    startTime: string;
    endTime: string;
    title?: string;
    notes?: string;
    timezone?: string;
  }) {
    // Check for conflicts
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        calendarId: data.calendarId,
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        OR: [
          {
            startTime: { lt: new Date(data.endTime) },
            endTime: { gt: new Date(data.startTime) },
          },
        ],
      },
    });

    if (conflict) {
      throw new BadRequestException('Time slot is already booked');
    }

    // Check max bookings per day
    const meetingType = await this.prisma.meetingType.findFirst({ where: { id: data.meetingTypeId } });
    if (meetingType?.maxBookingsPerDay) {
      const dayStart = new Date(data.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(data.startTime);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCount = await this.prisma.appointment.count({
        where: {
          calendarId: data.calendarId,
          meetingTypeId: data.meetingTypeId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          startTime: { gte: dayStart, lte: dayEnd },
        },
      });

      if (dayCount >= meetingType.maxBookingsPerDay) {
        throw new BadRequestException('Maximum bookings per day reached');
      }
    }

    // Round-robin assignment
    let assigneeId = data.assigneeId;
    if (!assigneeId) {
      const calendar = await this.prisma.calendar.findFirst({
        where: { id: data.calendarId },
        include: { members: { orderBy: { priority: 'asc' } } },
      });
      if (calendar?.type === 'ROUND_ROBIN' && calendar.members.length > 0) {
        // Get the member with fewest appointments this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        let minCount = Infinity;
        for (const member of calendar.members) {
          const count = await this.prisma.appointment.count({
            where: {
              assigneeId: member.userId,
              calendarId: data.calendarId,
              startTime: { gte: weekStart },
              status: { in: ['SCHEDULED', 'CONFIRMED'] },
            },
          });
          if (count < minCount) {
            minCount = count;
            assigneeId = member.userId;
          }
        }
      }
    }

    return this.prisma.appointment.create({
      data: {
        tenantId,
        calendarId: data.calendarId,
        meetingTypeId: data.meetingTypeId,
        contactId: data.contactId,
        assigneeId,
        title: data.title || 'Appointment',
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        timezone: data.timezone || 'UTC',
        notes: data.notes,
        status: meetingType?.requiresConfirmation ? 'SCHEDULED' : 'CONFIRMED',
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        meetingType: { select: { id: true, name: true, duration: true } },
      },
    });
  }

  async listAppointments(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.calendarId) where.calendarId = query.calendarId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.status) where.status = query.status;
    if (query.startDate && query.endDate) {
      where.startTime = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { startTime: 'asc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          meetingType: { select: { id: true, name: true, duration: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findAppointment(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        meetingType: true,
        calendar: { select: { id: true, name: true } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async updateAppointment(tenantId: string, id: string, data: Record<string, unknown>) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async confirmAppointment(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async cancelAppointment(tenantId: string, id: string, reason?: string) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }

  async rescheduleAppointment(tenantId: string, id: string, data: { startTime: string; endTime: string; reason?: string }) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data: {
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: 'RESCHEDULED',
        rescheduledFrom: appt.startTime.toISOString(),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async completeAppointment(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async markNoShow(tenantId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'NO_SHOW' },
    });
  }
}
