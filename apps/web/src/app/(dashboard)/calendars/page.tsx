'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useApiQuery } from '@/hooks/use-api';

interface Appointment {
  id: string;
  title: string;
  contactName: string;
  startTime: string;
  endTime: string;
  status: string;
  calendarName: string;
  color: string;
}

interface CalendarOption {
  id: string;
  name: string;
}

const fallbackCalendars: CalendarOption[] = [
  { id: '1', name: 'Sales Calls' },
  { id: '2', name: 'Product Demos' },
  { id: '3', name: 'Team Meetings' },
];

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

function generateWeekAppointments(weekStart: dayjs.Dayjs): Appointment[] {
  return [
    { id: '1', title: 'Product Demo', contactName: 'Sarah Johnson', startTime: weekStart.add(1, 'day').hour(10).toISOString(), endTime: weekStart.add(1, 'day').hour(10).minute(30).toISOString(), status: 'CONFIRMED', calendarName: 'Product Demos', color: '#3B82F6' },
    { id: '2', title: 'Discovery Call', contactName: 'Mike Chen', startTime: weekStart.add(1, 'day').hour(14).toISOString(), endTime: weekStart.add(1, 'day').hour(15).toISOString(), status: 'SCHEDULED', calendarName: 'Sales Calls', color: '#10B981' },
    { id: '3', title: 'Onboarding', contactName: 'Lisa Park', startTime: weekStart.add(2, 'day').hour(9).toISOString(), endTime: weekStart.add(2, 'day').hour(9).minute(45).toISOString(), status: 'CONFIRMED', calendarName: 'Product Demos', color: '#3B82F6' },
    { id: '4', title: 'Strategy Review', contactName: 'Tom Wilson', startTime: weekStart.add(3, 'day').hour(11).toISOString(), endTime: weekStart.add(3, 'day').hour(12).toISOString(), status: 'CONFIRMED', calendarName: 'Team Meetings', color: '#8B5CF6' },
    { id: '5', title: 'Follow Up', contactName: 'Emma Davis', startTime: weekStart.add(4, 'day').hour(15).toISOString(), endTime: weekStart.add(4, 'day').hour(15).minute(30).toISOString(), status: 'SCHEDULED', calendarName: 'Sales Calls', color: '#10B981' },
  ];
}

export default function CalendarsPage() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedCalendar, setSelectedCalendar] = useState('all');
  const [view, setView] = useState<'week' | 'month' | 'day'>('week');

  const weekStart = currentDate.startOf('week');
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const appointments = generateWeekAppointments(weekStart);

  const navigateWeek = (dir: number) => {
    setCurrentDate(currentDate.add(dir, 'week'));
  };

  const filteredAppointments = selectedCalendar === 'all'
    ? appointments
    : appointments.filter((a) => a.calendarName === fallbackCalendars.find((c) => c.id === selectedCalendar)?.name);

  const getAppointmentsForSlot = (day: dayjs.Dayjs, hour: number) => {
    return filteredAppointments.filter((a) => {
      const start = dayjs(a.startTime);
      return start.isSame(day, 'day') && start.hour() === hour;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendars"
        description="Manage your appointments and bookings"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Calendar Grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {weekStart.format('MMM D')} - {weekStart.add(6, 'day').format('MMM D, YYYY')}
              </h2>
              <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(dayjs())}>
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Calendar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calendars</SelectItem>
                  {fallbackCalendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>{cal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border">
            {/* Day Headers */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-2" />
              {weekDays.map((day) => (
                <div
                  key={day.format('YYYY-MM-DD')}
                  className={cn(
                    'border-l p-2 text-center',
                    day.isSame(dayjs(), 'day') && 'bg-primary/5',
                  )}
                >
                  <p className="text-xs text-muted-foreground">{day.format('ddd')}</p>
                  <p className={cn(
                    'text-lg font-semibold',
                    day.isSame(dayjs(), 'day') && 'text-primary',
                  )}>
                    {day.format('D')}
                  </p>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b">
                  <div className="flex items-start justify-end p-2 pr-3 text-xs text-muted-foreground">
                    {dayjs().hour(hour).format('h A')}
                  </div>
                  {weekDays.map((day) => {
                    const slotAppts = getAppointmentsForSlot(day, hour);
                    return (
                      <div
                        key={`${day.format('YYYY-MM-DD')}-${hour}`}
                        className={cn(
                          'min-h-[60px] border-l p-1',
                          day.isSame(dayjs(), 'day') && 'bg-primary/5',
                        )}
                      >
                        {slotAppts.map((appt) => (
                          <div
                            key={appt.id}
                            className="mb-1 cursor-pointer rounded-md px-2 py-1 text-xs text-white"
                            style={{ backgroundColor: appt.color }}
                          >
                            <p className="font-medium truncate">{appt.title}</p>
                            <p className="opacity-80 truncate">{appt.contactName}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Upcoming */}
        <div className="w-full lg:w-72">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id} className="flex gap-3">
                    <div className="w-1 rounded-full" style={{ backgroundColor: appt.color }} />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium">{appt.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {appt.contactName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {dayjs(appt.startTime).format('ddd, MMM D h:mm A')}
                      </div>
                      <Badge
                        variant={appt.status === 'CONFIRMED' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {appt.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
