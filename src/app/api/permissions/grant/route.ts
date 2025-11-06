import { stackServerApp } from '@/stack/server';
import { NextResponse } from 'next/server';

interface StackError extends Error {
  statusCode?: number;
  humanReadableMessage?: string;
  __stackKnownErrorBrand?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roleInput = typeof body?.role === 'string' ? body.role.trim() : '';

    if (!roleInput) {
      return NextResponse.json(
        { error: 'Role parameter is required and must be a string' },
        { status: 400 }
      );
    }

    const role = roleInput;

    // Get the authenticated user or throw if not authenticated
    const user = await stackServerApp.getUser({ or: 'throw' });

    // Validate that the role is one of our predefined roles
    const validRoles = ['role:admin', 'role:mentor', 'role:student'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    const currentPermissions = await user.listPermissions();
    const canManageRoles = currentPermissions.some((p) => p.id === 'role:admin');
    if (!canManageRoles) {
      return NextResponse.json(
        { error: 'Only admins may manage permissions.' },
        { status: 403 },
      );
    }

    // Check if the user already has this role
    const hasPermission = currentPermissions.some(p => p.id === role);

    if (hasPermission) {
      return NextResponse.json(
        { message: 'User already has this permission' },
        { status: 200 }
      );
    }

    // Grant the permission using stackAuth
    await user.grantPermission(role);
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully granted ${role} permission`
    });
  } catch (error) {
    const stackError = error as StackError;
    console.error('Error granting permission:', stackError);
    
    // Handle specific error cases
    if (stackError.humanReadableMessage) {
      return NextResponse.json(
        { error: stackError.humanReadableMessage },
        { status: stackError.statusCode || 500 }
      );
    }
    
    const normalizedMessage = stackError.message?.toLowerCase();
    if (normalizedMessage?.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized to grant permissions' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to grant permission' },
      { status: 500 }
    );
  }
}
