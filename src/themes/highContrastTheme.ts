import { Theme } from '../types/theme';

export const highContrastTheme: Theme = {
  id: 'high-contrast',
  name: 'High Contrast',
  colors: {
    primary: '#000000',
    secondary: '#000000',
    tertiary: '#000000',
    text: '#ffffff',
    textSecondary: '#ffff00',
    accent: '#00ffff',
    accentHover: '#ffffff',
    border: '#ffffff',
    selection: '#00ffff40',
    surface: '#000000',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0000'
  },
  isDark: true
};
