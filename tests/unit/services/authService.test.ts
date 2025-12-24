import { authService, User } from '@/src/services/authService';
import { consoleService } from '@/src/services/consoleService';

// Mock consoleService
vi.mock('@/src/services/consoleService', () => ({
  consoleService: {
    log: vi.fn(),
  },
  LogLevel: {
    INFO: 'INFO',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
  },
}));

// Mock window.location
const originalLocation = window.location;
const mockLocation = {
  href: 'http://localhost:3000/',
  assign: vi.fn(),
};

describe('AuthService', () => {
  beforeAll(() => {
    // Delete window.location and replace with mock
    delete (window as any).location;
    window.location = mockLocation as any;
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (authService as any).user = null;
    global.fetch = vi.fn();
  });

  describe('getUser', () => {
    it('should return null initially', () => {
      expect(authService.getUser()).toBeNull();
    });

    it('should return user after successful session check', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        profile_picture: 'pic.jpg',
        is_admin: false,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        last_login_at: '2023-01-02',
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: mockUser,
        }),
      });

      const user = await authService.checkSession();
      expect(user).toEqual(mockUser);
      expect(authService.getUser()).toEqual(mockUser);
    });
  });

  describe('checkSession', () => {
    it('should log info when starting check', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { name: 'Test' } }),
      });

      await authService.checkSession();
      expect(consoleService.log).toHaveBeenCalledWith(
        'Checking session...',
        'INFO'
      );
    });

    it('should handle successful session', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        profile_picture: 'pic.jpg',
        is_admin: false,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        last_login_at: '2023-01-02',
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      const result = await authService.checkSession();
      expect(result).toEqual(mockUser);
      expect(consoleService.log).toHaveBeenCalledWith(
        'Session valid for Test User',
        'SUCCESS'
      );
    });

    it('should handle 401 and redirect to login url from response', async () => {
      const loginUrl = 'http://api.com/login?redirect=...';
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ login_url: loginUrl }),
      });

      const result = await authService.checkSession();
      expect(result).toBeNull();
      expect(window.location.href).toBe(loginUrl);
      expect(consoleService.log).toHaveBeenCalledWith(
        'Session invalid, redirecting to login...',
        'WARNING'
      );
    });

    it('should handle 401 and fallback login url when json fails', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      const result = await authService.checkSession();
      expect(result).toBeNull();
      expect(window.location.href).toContain('https://storage.jonathanburnhams.com/auth/login?redirect=');
      expect(consoleService.log).toHaveBeenCalledWith(
        'Session invalid, redirecting to login...',
        'WARNING'
      );
    });

    it('should handle other error statuses', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const result = await authService.checkSession();
      expect(result).toBeNull();
      expect(consoleService.log).toHaveBeenCalledWith(
        'Session check failed with status 500',
        'ERROR'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authService.checkSession();
      expect(result).toBeNull();
      expect(consoleService.log).toHaveBeenCalledWith(
        'Session check failed: Error: Network error',
        'ERROR'
      );
    });
  });

  describe('logout', () => {
    it('should clear user', () => {
      (authService as any).user = { id: 1, name: 'Test' };
      authService.logout();
      expect(authService.getUser()).toBeNull();
    });
  });
});
