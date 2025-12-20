import { consoleService, LogLevel } from './consoleService';

const STORAGE_API_URL = 'https://storage.jonathanburnhams.com';

export interface User {
  id: number;
  email: string;
  name: string;
  profile_picture: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface SessionResponse {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  last_used_at: string;
  user: User;
}

export interface AuthError {
  error: string;
  message: string;
  login_url?: string;
}

class AuthService {
  private user: User | null = null;

  public getUser(): User | null {
    return this.user;
  }

  public async checkSession(): Promise<User | null> {
    try {
      consoleService.log('Checking session...', LogLevel.INFO);
      const response = await fetch(`${STORAGE_API_URL}/api/session`, {
        method: 'GET',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const session: SessionResponse = await response.json();
        this.user = session.user;
        consoleService.log(`Session valid for ${this.user.name}`, LogLevel.SUCCESS);
        return this.user;
      } else if (response.status === 401) {
        // Try to get login_url from response body if available
        let loginUrl = `${STORAGE_API_URL}/auth/login?redirect=${encodeURIComponent(window.location.href)}`;
        try {
            const errorData: AuthError = await response.json();
            if (errorData.login_url) {
                loginUrl = errorData.login_url;
            }
        } catch (e) {
            // Ignore JSON parse error on 401, proceed with default loginUrl construction
        }

        consoleService.log('Session invalid, redirecting to login...', LogLevel.WARNING);
        window.location.href = loginUrl;
        return null;
      } else {
        consoleService.log(`Session check failed with status ${response.status}`, LogLevel.ERROR);
        return null;
      }
    } catch (error) {
      consoleService.log(`Session check failed: ${error}`, LogLevel.ERROR);
      return null;
    }
  }

  public logout(): void {
    // Assuming logout is handled by the storage service or clearing cookies,
    // but typically we might want to redirect to a logout endpoint.
    // The docs don't specify a logout endpoint, but we can clear local user state.
    this.user = null;
    // For now, maybe just redirect to home or refresh?
    // The storage service manages the session cookie.
  }
}

export const authService = new AuthService();
