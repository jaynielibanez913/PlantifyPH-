import { NextRequest, NextResponse } from 'next/server';
import { createReminder, listReminders } from '@/features/reminders/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { reminderCreateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const reminders = listReminders(user.id);
    return NextResponse.json({ reminders }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json();
    const parsed = reminderCreateSchema.parse(body);

    const reminder = createReminder(user, parsed);
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
