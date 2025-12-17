export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    border: string;
    selection: string;
    surface: string;
    success: string;
    warning: string;
    error: string;
  };
  isDark: boolean;
}
