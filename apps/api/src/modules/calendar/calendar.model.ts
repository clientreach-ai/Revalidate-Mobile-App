import { prisma } from '../../lib/prisma';
import { ApiError } from '../../common/middleware/error-handler';
import {
  sendPushNotification,
  isValidExpoPushToken,
} from '../notifications/push.service';

export interface CalendarEvent {
  id: string;
  userId: string;
  type: 'official' | 'personal';
  title: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  invite: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  attendees?: {
    id: string;
    userId: string | null;
    name: string | null;
    email: string | null;
    status: string | null;
  }[];
}

export interface CreateCalendarEvent {
  type: 'official' | 'personal';
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  invite?: string;
}

export interface UpdateCalendarEvent {
  type?: 'official' | 'personal';
  title?: string;
  description?: string;
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  invite?: string;
}

export interface GetCalendarEventsOptions {
  startDate?: string;
  endDate?: string;
  type?: 'official' | 'personal';
  limit?: number;
  offset?: number;
}


function mapEventType(dbType: string): 'official' | 'personal' {
  if (dbType === '1' || dbType === 'official') return 'official';
  if (dbType === '2' || dbType === 'personal') return 'personal';
  return 'personal';
}


function mapTypeToDb(apiType: 'official' | 'personal'): string {
  return apiType === 'official' ? '1' : '2';
}

export async function createCalendarEvent(
  userId: string,
  data: CreateCalendarEvent
): Promise<CalendarEvent> {
  if (!userId) {
    throw new ApiError(400, 'Missing userId');
  }

  let userBigInt: bigint;
  try {
    userBigInt = BigInt(userId);
  } catch (e) {
    throw new ApiError(400, 'Invalid userId');
  }

  const eventDate = new Date(data.date);
  if (Number.isNaN(eventDate.getTime())) {
    throw new ApiError(400, 'Invalid date format');
  }

  const endDate = data.endDate ? new Date(data.endDate) : null;
  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new ApiError(400, 'Invalid endDate format');
  }

  try {
    const event = await prisma.user_calendars.create({
      data: {
        user_id: userBigInt,
        type: mapTypeToDb(data.type),
        title: data.title,
        date: eventDate,
        end_date: endDate,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        venue: data.location || null,
        invite: data.invite || null,
        status: 'one',
      },
    });

    return {
      id: event.id.toString(),
      userId: event.user_id.toString(),
      type: mapEventType(event.type),
      title: event.title,
      description: data.description ?? null,
      date: event.date,
      endDate: event.end_date,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.venue,
      invite: event.invite,
      status: event.status,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    };
  } catch (err: any) {
    console.error('Prisma error creating calendar event:', err);
    throw new ApiError(500, 'Failed to create calendar event');
  }
}


export async function getCalendarEventById(
  eventId: string,
  userId: string
): Promise<CalendarEvent | null> {
  const event = await prisma.user_calendars.findFirst({
    where: {
      id: BigInt(eventId),
      OR: [
        { user_id: BigInt(userId) },
        { attendees: { some: { user_id: BigInt(userId) } } },
      ],
    },
    include: {
      attendees: {
        include: { users: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!event) {
    return null;
  }

  return {
    id: event.id.toString(),
    userId: event.user_id.toString(),
    type: mapEventType(event.type),
    title: event.title,
    description: null,
    date: event.date,
    endDate: event.end_date,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.venue,
    invite: event.invite,
    status: event.status,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    attendees:
      event.attendees?.map((a) => ({
        id: a.id.toString(),
        userId: a.user_id ? a.user_id.toString() : null,
        name: a.users ? a.users.name : null,
        email: a.attendee_email ?? (a.users ? a.users.email : null),
        status: a.status ?? null,
      })) || [],
  };
}


export async function getUserCalendarEvents(
  userId: string,
  options: GetCalendarEventsOptions = {}
): Promise<{ events: CalendarEvent[]; total: number }> {
  const where: any = {
    OR: [
      { user_id: BigInt(userId) },
      {
        attendees: {
          some: {
            user_id: BigInt(userId),
            status: 'accepted',
          },
        },
      },
    ],
  };

  if (options.startDate) {
    const dateCondition = { date: { gte: new Date(options.startDate) } };
    if (options.endDate) {
      (dateCondition.date as any).lte = new Date(options.endDate);
    }

  }

  const finalWhere: any = {
    AND: [where],
  };

  if (options.startDate || options.endDate) {
    const dateFilter: any = { date: {} };
    if (options.startDate) dateFilter.date.gte = new Date(options.startDate);
    if (options.endDate) dateFilter.date.lte = new Date(options.endDate);
    finalWhere.AND.push(dateFilter);
  }

  if (options.type) {
    finalWhere.AND.push({ type: mapTypeToDb(options.type) });
  }

  const [events, total] = await Promise.all([
    prisma.user_calendars.findMany({
      where: finalWhere,
      include: {
        attendees: {
          include: { users: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { date: 'asc' },
      take: options.limit,
      skip: options.offset,
    }),
    prisma.user_calendars.count({ where: finalWhere }),
  ]);

  return {
    events: events.map((event) => ({
      id: event.id.toString(),
      userId: event.user_id.toString(),
      type: mapEventType(event.type),
      title: event.title,
      description: null,
      date: event.date,
      endDate: event.end_date,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.venue,
      invite: event.invite,
      status: event.status,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    })),
    total,
  };
}


export async function updateCalendarEvent(
  eventId: string,
  userId: string,
  data: UpdateCalendarEvent
): Promise<CalendarEvent> {
  const existing = await prisma.user_calendars.findFirst({
    where: {
      id: BigInt(eventId),
      user_id: BigInt(userId),
    },
  });

  if (!existing) {
    throw new ApiError(404, 'Calendar event not found');
  }

  const updateData: any = {};

  if (data.type !== undefined) {
    updateData.type = mapTypeToDb(data.type);
  }
  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.date !== undefined) {
    updateData.date = new Date(data.date);
  }
  if (data.endDate !== undefined) {
    updateData.end_date = data.endDate ? new Date(data.endDate) : null;
  }
  if (data.startTime !== undefined) {
    updateData.start_time = data.startTime || null;
  }
  if (data.endTime !== undefined) {
    updateData.end_time = data.endTime || null;
  }
  if (data.location !== undefined) {
    updateData.venue = data.location || null;
  }
  if (data.invite !== undefined) {
    updateData.invite = data.invite || null;
  }

  updateData.updated_at = new Date();

  const updated = await prisma.user_calendars.update({
    where: { id: BigInt(eventId) },
    data: updateData,
  });

  return {
    id: updated.id.toString(),
    userId: updated.user_id.toString(),
    type: updated.type as 'official' | 'personal',
    title: updated.title,
    description: null,
    date: updated.date,
    endDate: updated.end_date,
    startTime: updated.start_time,
    endTime: updated.end_time,
    location: updated.venue,
    invite: updated.invite,
    status: updated.status,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function deleteCalendarEvent(
  eventId: string,
  userId: string
): Promise<void> {
  const event = await prisma.user_calendars.findFirst({
    where: {
      id: BigInt(eventId),
      user_id: BigInt(userId),
    },
  });

  if (!event) {
    throw new ApiError(404, 'Calendar event not found');
  }

  await prisma.user_calendars.delete({
    where: { id: BigInt(eventId) },
  });
}


export type InviteInput = { userId?: string; email?: string };

export async function inviteAttendees(
  eventId: string,
  organizerId: string,
  attendees: InviteInput[]
): Promise<any[]> {
  const events = await prisma.$queryRaw<any[]>`
    SELECT user_calendars.id, title, date, users.name as organizerName
    FROM user_calendars
    LEFT JOIN users ON user_calendars.user_id = users.id
    WHERE user_calendars.id = ${BigInt(eventId)} AND user_calendars.user_id = ${BigInt(organizerId)}
    LIMIT 1
  `;
  const event = events?.[0] || null;

  if (!event) {
    throw new ApiError(404, 'Calendar event not found');
  }

  const organizerName = event.organizerName || 'Someone';
  const created: any[] = [];

  for (const a of attendees) {
    let user = null;

    if (a.userId) {
      try {
        const users = await prisma.$queryRaw<any[]>`
          SELECT id, email, name, device_token FROM users WHERE id = ${BigInt(a.userId)} LIMIT 1
        `;
        user = users?.[0] || null;
      } catch (e) {
        user = null;
      }
    }

    if (!user && a.email) {
      const users = await prisma.$queryRaw<any[]>`
        SELECT id, email, name, device_token FROM users WHERE email = ${a.email} LIMIT 1
      `;
      user = users?.[0] || null;
    }

    const attendeeRecord = await prisma.user_calendar_attendees.create({
      data: {
        event_id: event.id,
        user_id: user ? user.id : undefined,
        attendee_email: user ? user.email : (a.email ?? null),
        status: 'invited',
      },
    });

    const notificationTitle = 'Event invitation';
    const notificationMessage = `${organizerName} has invited you to join "${event.title}" on ${event.date.toISOString().split('T')[0]}`;

    try {
      if (user) {
        await prisma.$executeRaw`
          INSERT INTO notifications (user_id, title, message, type, status, recyclebin_status, created_at, updated_at)
          VALUES (${user.id}, ${notificationTitle}, ${notificationMessage}, ${`calendar_invite:${eventId}`}, '0', '0', NOW(), NOW())
        `;

        if (user.device_token) {
          const deviceToken = String(user.device_token);
          if (isValidExpoPushToken(deviceToken)) {
            await sendPushNotification(
              deviceToken,
              notificationTitle,
              notificationMessage,
              { type: 'calendar_invite', eventId: eventId }
            );
          }
        }
      }
    } catch (err) {
      console.warn('Failed to create notification for invite', err);
    }

    created.push({
      id: attendeeRecord.id.toString(),
      userId: attendeeRecord.user_id?.toString() ?? null,
      email: attendeeRecord.attendee_email,
      status: attendeeRecord.status,
    });
  }

  return created;
}

export async function respondToInvite(
  eventId: string,
  userId: string,
  attendeeId: string,
  status: 'accepted' | 'declined'
): Promise<any> {
  const attendee = await prisma.user_calendar_attendees.findFirst({
    where: { id: BigInt(attendeeId), event_id: BigInt(eventId) },
  });
  if (!attendee) {
    throw new ApiError(404, 'Invite not found');
  }

  const events = await prisma.$queryRaw<any[]>`
    SELECT uc.id, uc.user_id, uc.title, uc.date, u.id as organizer_id, u.name as organizer_name, u.email as organizer_email, u.device_token as organizer_device_token
    FROM user_calendars uc
    LEFT JOIN users u ON uc.user_id = u.id
    WHERE uc.id = ${BigInt(eventId)}
    LIMIT 1
  `;
  const event = events?.[0] || null;

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  const userIdNum = BigInt(userId);
  const isOwnerMatch = attendee.user_id && attendee.user_id === userIdNum;

  let respondingUser = null;
  if (!isOwnerMatch) {
    if (!attendee.attendee_email) {
      throw new ApiError(403, 'Not authorized to respond to this invite');
    }
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, device_token FROM users WHERE id = ${userIdNum} LIMIT 1
    `;
    respondingUser = users?.[0] || null;
    if (
      !respondingUser ||
      String(respondingUser.email).toLowerCase() !==
      String(attendee.attendee_email).toLowerCase()
    ) {
      throw new ApiError(403, 'Not authorized to respond to this invite');
    }
  } else {
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, device_token FROM users WHERE id = ${userIdNum} LIMIT 1
    `;
    respondingUser = users?.[0] || null;
  }

  const updated = await prisma.user_calendar_attendees.update({
    where: { id: BigInt(attendeeId) },
    data: { status },
  });

  if (status === 'accepted') {
    const responderName =
      respondingUser?.name ||
      respondingUser?.email ||
      attendee.attendee_email ||
      'Someone';
    const eventTitle = event.title || 'your event';
    const eventDate =
      event.date instanceof Date
        ? event.date.toISOString().split('T')[0]
        : String(event.date).split('T')[0];

    const notificationTitle = 'Event Join Request Accepted';
    const notificationMessage = `${responderName} has accepted your invitation to join "${eventTitle}" on ${eventDate}`;

    try {
      await prisma.$executeRaw`
        INSERT INTO notifications (user_id, title, message, type, status, recyclebin_status, created_at, updated_at)
        VALUES (${event.organizer_id}, ${notificationTitle}, ${notificationMessage}, ${`calendar_response:${eventId}`}, '0', '0', NOW(), NOW())
      `;
    } catch (err) {
      console.warn('Failed to create in-app notification for organizer', err);
    }

    if (event.organizer_device_token) {
      try {
        const deviceToken = String(event.organizer_device_token);
        if (isValidExpoPushToken(deviceToken)) {
          await sendPushNotification(
            deviceToken,
            notificationTitle,
            notificationMessage,
            { type: 'calendar_response', eventId: eventId, status: 'accepted' }
          );
        }
      } catch (err) {
        console.warn('Failed to send push notification to organizer', err);
      }
    }
  }

  return {
    id: updated.id.toString(),
    userId: updated.user_id ? updated.user_id.toString() : null,
    email: updated.attendee_email,
    status: updated.status,
  };
}

export async function copyCalendarEvent(
  eventId: string,
  userId: string,
  newDateStr: string
): Promise<CalendarEvent> {
  const existing = await prisma.user_calendars.findFirst({
    where: { id: BigInt(eventId), user_id: BigInt(userId) },
  });
  if (!existing) {
    throw new ApiError(404, 'Calendar event not found');
  }

  const newDate = new Date(newDateStr);
  if (Number.isNaN(newDate.getTime())) {
    throw new ApiError(400, 'Invalid date format');
  }

  const created = await prisma.user_calendars.create({
    data: {
      user_id: existing.user_id,
      type: existing.type,
      title: existing.title,
      date: newDate,
      end_date: existing.end_date,
      start_time: existing.start_time,
      end_time: existing.end_time,
      venue: existing.venue,
      invite: existing.invite,
      status: existing.status,
    },
  });

  // copy attendees
  const attendees = await prisma.user_calendar_attendees.findMany({
    where: { event_id: existing.id },
  });
  for (const a of attendees) {
    await prisma.user_calendar_attendees.create({
      data: {
        event_id: created.id,
        user_id: a.user_id ?? undefined,
        attendee_email: a.attendee_email ?? undefined,
        status: a.status ?? 'invited',
      },
    });
  }

  return {
    id: created.id.toString(),
    userId: created.user_id.toString(),
    type: mapEventType(created.type),
    title: created.title,
    description: null,
    date: created.date,
    endDate: created.end_date,
    startTime: created.start_time,
    endTime: created.end_time,
    location: created.venue,
    invite: created.invite,
    status: created.status,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  };
}
