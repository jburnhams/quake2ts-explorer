export interface GeneralSettings {
  language: string;
  defaultMode: 'browser' | 'last-used';
  autoLoadDefaultPak: boolean;
  defaultFileTreeSort: 'name' | 'type' | 'size';
  confirmBeforeClose: boolean;
}

export interface GraphicsSettings {
  renderQuality: 'low' | 'medium' | 'high' | 'ultra';
  fov: number; // 60-120
  vsync: boolean;
  antialiasing: 'none' | 'fxaa' | 'msaa';
  textureFiltering: 'nearest' | 'bilinear' | 'trilinear';
  anisotropicFiltering: 1 | 2 | 4 | 8 | 16;
  resolutionScale: number; // 0.5 - 2.0
  frameRateLimit: 30 | 60 | 120 | 0; // 0 for unlimited
}

export interface AudioSettings {
  masterVolume: number; // 0.0 - 1.0
  sfxVolume: number; // 0.0 - 1.0
  musicVolume: number; // 0.0 - 1.0
  voiceVolume: number; // 0.0 - 1.0
  outputDevice: string;
  spatialAudio: boolean;
  audioQuality: 'low' | 'high';
}

export interface ControlSettings {
  mouseSensitivityX: number;
  mouseSensitivityY: number;
  invertMouseY: boolean;
  keyboardLayout: 'qwerty' | 'azerty' | 'qwertz';
  enableGamepad: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeFont: boolean;
  colorBlindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  reduceMotion: boolean;
  screenReader: boolean;
  subtitles: boolean;
  keyboardOnly: boolean;
}

export interface AdvancedSettings {
  developerMode: boolean;
  verboseLogging: boolean;
  experimentalFeatures: boolean;
  cacheSizeLimit: number; // In MB
}

export interface AppSettings {
  general: GeneralSettings;
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  accessibility: AccessibilitySettings;
  advanced: AdvancedSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    language: 'en',
    defaultMode: 'browser',
    autoLoadDefaultPak: true,
    defaultFileTreeSort: 'name',
    confirmBeforeClose: true
  },
  graphics: {
    renderQuality: 'high',
    fov: 90,
    vsync: true,
    antialiasing: 'none',
    textureFiltering: 'bilinear',
    anisotropicFiltering: 4,
    resolutionScale: 1.0,
    frameRateLimit: 60
  },
  audio: {
    masterVolume: 1.0,
    sfxVolume: 1.0,
    musicVolume: 0.8,
    voiceVolume: 1.0,
    outputDevice: 'default',
    spatialAudio: true,
    audioQuality: 'high'
  },
  controls: {
    mouseSensitivityX: 2.0,
    mouseSensitivityY: 2.0,
    invertMouseY: false,
    keyboardLayout: 'qwerty',
    enableGamepad: true
  },
  accessibility: {
    highContrast: false,
    largeFont: false,
    colorBlindMode: 'none',
    reduceMotion: false,
    screenReader: false,
    subtitles: false,
    keyboardOnly: false
  },
  advanced: {
    developerMode: false,
    verboseLogging: false,
    experimentalFeatures: false,
    cacheSizeLimit: 512
  }
};
