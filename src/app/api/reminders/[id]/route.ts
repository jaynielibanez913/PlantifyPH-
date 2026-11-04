import { NextRequest, NextResponse } from 'next/server';
import { deleteReminder, updateReminder } from '@/features/reminders/service';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError } from '@/lib/errors/app-error';
import { reminderUpdateSchema } from '@/lib/validation/schemas';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = reminderUpdateSchema.parse(body);

    const reminder = updateReminder(user, id, parsed);
    return NextResponse.json({ reminder }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await context.params;
    deleteReminder(user, id);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
