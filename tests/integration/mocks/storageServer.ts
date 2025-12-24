import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { STORAGE_API_URL } from '../src/services/authService';

export const handlers = [
  http.get(`${STORAGE_API_URL}/api/collections`, () => {
    return HttpResponse.json([
      { id: 1, name: 'existing-collection', description: 'desc' }
    ]);
  }),

  http.post(`${STORAGE_API_URL}/api/collections`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      name: body.name,
      description: body.description,
      user_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { status: 201 });
  }),

  http.post(`${STORAGE_API_URL}/api/storage/entry`, async ({ request }) => {
    // For FormData we can just assume success for now, or inspect if needed
    // const formData = await request.formData();
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
      key: 'uploaded-file.txt',
      type: 'text/plain',
      user_id: 1
    }, { status: 201 });
  }),

  http.get(`${STORAGE_API_URL}/api/session`, () => {
    return HttpResponse.json({
      id: 'session-id',
      user_id: 1,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        profile_picture: '',
        is_admin: false
      }
    });
  })
];

export const server = setupServer(...handlers);
