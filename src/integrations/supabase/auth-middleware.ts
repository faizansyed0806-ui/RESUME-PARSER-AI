import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const cookies = request.headers.get('cookie') || '';
    const hasAdminToken = cookies.includes('admin_token=true');

    if (!hasAdminToken) {
      throw new Error('Unauthorized: Admin token missing');
    }

    // Dummy user ID since we no longer use a real database
    const dummyUserId = "00000000-0000-0000-0000-000000000000";

    return next({
      context: {
        userId: dummyUserId,
      },
    });
  },
);
