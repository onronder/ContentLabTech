// Application constants
export const APP_NAME = "ContentLab Nexus";
export const APP_DESCRIPTION =
  "Comprehensive content marketing analytics platform";
export const APP_VERSION = "1.0.0";

// API constants
export const API_BASE_URL = process.env["NEXT_PUBLIC_API_URL"] || "/api";
export const API_TIMEOUT = 30000; // 30 seconds

// Pagination constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Content constants
export const MAX_CONTENT_TITLE_LENGTH = 200;
export const MAX_CONTENT_DESCRIPTION_LENGTH = 500;
export const MAX_KEYWORD_COUNT = 50;

// Date formats
export const DATE_FORMAT = "yyyy-MM-dd";
export const DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
export const DISPLAY_DATE_FORMAT = "MMM dd, yyyy";
export const DISPLAY_DATETIME_FORMAT = "MMM dd, yyyy HH:mm";

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "contentlab_auth_token",
  USER_PREFERENCES: "contentlab_user_preferences",
  THEME: "contentlab_theme",
  RECENT_PROJECTS: "contentlab_recent_projects",
} as const;

// Analytics periods
export const ANALYTICS_PERIODS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
  all: "All time",
} as const;

// Content statuses
export const CONTENT_STATUSES = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
} as const;

// User roles
export const USER_ROLES = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
} as const;
