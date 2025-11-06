import { stackServerApp } from '@/stack/server';
import { NextResponse } from 'next/server';

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

    // Confirm the user currently has this role
    const hasPermission = currentPermissions.some(p => p.id === role);

    if (!hasPermission) {
      return NextResponse.json(
        { message: 'User does not have this permission' },
        { status: 404 }
      );
    }

    // Revoke the permission
    await user.revokePermission(role);
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully revoked ${role} permission`
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    
    if (error instanceof Error) {
      const normalizedMessage = error.message?.toLowerCase();
      if (normalizedMessage?.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized to revoke permissions' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to revoke permission' },
      { status: 500 }
    );
  }
}
