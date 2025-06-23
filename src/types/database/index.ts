// Database table types (mirror Supabase schema)
export interface DatabaseUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: "admin" | "editor" | "viewer";
  created_at: string;
  updated_at: string;
}

export interface DatabaseProject {
  id: string;
  name: string;
  description?: string;
  url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseContentItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  content?: string;
  status: "draft" | "published" | "archived";
  project_id: string;
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseKeyword {
  id: string;
  keyword: string;
  search_volume: number;
  difficulty: number;
  content_id: string;
  created_at: string;
}

export interface DatabaseCompetitor {
  id: string;
  name: string;
  domain: string;
  description?: string;
  project_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAnalyticsData {
  id: string;
  content_id?: string;
  project_id?: string;
  competitor_id?: string;
  date: string;
  views: number;
  clicks: number;
  impressions: number;
  ctr: number;
  average_position: number;
  bounce_rate: number;
  session_duration: number;
  created_at: string;
}

export interface DatabaseTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "admin" | "editor" | "viewer";
  invited_by: string;
  joined_at: string;
  created_at: string;
}

export interface DatabaseApiKey {
  id: string;
  name: string;
  key_hash: string;
  user_id: string;
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// Database function return types
export interface DatabaseFunctionResponse<T> {
  data: T;
  error?: {
    message: string;
    code: string;
  };
}

// Views and aggregated data types
export interface ProjectStatsView {
  project_id: string;
  total_content: number;
  published_content: number;
  total_views: number;
  total_clicks: number;
  average_ctr: number;
  last_updated: string;
}

export interface ContentPerformanceView {
  content_id: string;
  title: string;
  url: string;
  total_views: number;
  total_clicks: number;
  ctr: number;
  last_30_days_views: number;
  performance_trend: "up" | "down" | "stable";
}
