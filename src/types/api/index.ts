// Common API response types
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// User types
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  url?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  url?: string;
}

// Content types
export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  content?: string;
  status: "draft" | "published" | "archived";
  projectId: string;
  authorId: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentRequest {
  title: string;
  description?: string;
  url: string;
  content?: string;
  projectId: string;
}

// Analytics types
export interface AnalyticsMetrics {
  views: number;
  clicks: number;
  impressions: number;
  ctr: number; // Click-through rate
  averagePosition: number;
  bounceRate: number;
  sessionDuration: number;
}

export interface ContentAnalytics extends AnalyticsMetrics {
  contentId: string;
  date: string;
}

export interface ProjectAnalytics extends AnalyticsMetrics {
  projectId: string;
  period: string;
  contentCount: number;
  topKeywords: string[];
}

// Competitor types
export interface Competitor {
  id: string;
  name: string;
  domain: string;
  description?: string;
  projectId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompetitorRequest {
  name: string;
  domain: string;
  description?: string;
  projectId: string;
}

export interface CompetitorAnalysis {
  competitorId: string;
  metrics: AnalyticsMetrics;
  keywords: string[];
  topContent: {
    title: string;
    url: string;
    traffic: number;
  }[];
  date: string;
}
