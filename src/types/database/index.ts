// Database types generated from Supabase schema
export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["user_role"];
          permissions: Json;
          joined_at: string;
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["user_role"];
          permissions?: Json;
          joined_at?: string;
          created_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          permissions?: Json;
          joined_at?: string;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string | null;
          website_url: string | null;
          target_keywords: string[];
          settings: Json;
          status: Database["public"]["Enums"]["project_status"];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          description?: string | null;
          website_url?: string | null;
          target_keywords?: string[];
          settings?: Json;
          status?: Database["public"]["Enums"]["project_status"];
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          description?: string | null;
          website_url?: string | null;
          target_keywords?: string[];
          settings?: Json;
          status?: Database["public"]["Enums"]["project_status"];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_items: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          content: string | null;
          url: string;
          content_type: Database["public"]["Enums"]["content_type"];
          status: Database["public"]["Enums"]["content_status"];
          seo_score: number | null;
          readability_score: number | null;
          word_count: number | null;
          meta_title: string | null;
          meta_description: string | null;
          focus_keywords: string[];
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          content?: string | null;
          url: string;
          content_type?: Database["public"]["Enums"]["content_type"];
          status?: Database["public"]["Enums"]["content_status"];
          seo_score?: number | null;
          readability_score?: number | null;
          word_count?: number | null;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keywords?: string[];
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          content?: string | null;
          url?: string;
          content_type?: Database["public"]["Enums"]["content_type"];
          status?: Database["public"]["Enums"]["content_status"];
          seo_score?: number | null;
          readability_score?: number | null;
          word_count?: number | null;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keywords?: string[];
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      competitors: {
        Row: {
          id: string;
          project_id: string;
          team_id: string;
          name: string;
          website_url: string;
          description: string | null;
          market_share: number | null;
          monitoring_enabled: boolean;
          last_analyzed_at: string | null;
          competitor_name: string | null;
          competitor_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          team_id: string;
          name: string;
          website_url: string;
          description?: string | null;
          market_share?: number | null;
          monitoring_enabled?: boolean;
          last_analyzed_at?: string | null;
          competitor_name?: string | null;
          competitor_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          team_id?: string;
          name?: string;
          website_url?: string;
          description?: string | null;
          market_share?: number | null;
          monitoring_enabled?: boolean;
          last_analyzed_at?: string | null;
          competitor_name?: string | null;
          competitor_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      competitor_alerts: {
        Row: {
          id: string;
          project_id: string;
          team_id: string;
          competitor_id: string | null;
          alert_type:
            | "ranking_change"
            | "traffic_change"
            | "new_content"
            | "keyword_opportunity"
            | "technical_issue";
          keyword: string | null;
          threshold: number | null;
          frequency: "immediate" | "daily" | "weekly";
          is_active: boolean;
          alert_config: Json;
          last_triggered: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          team_id: string;
          competitor_id?: string | null;
          alert_type:
            | "ranking_change"
            | "traffic_change"
            | "new_content"
            | "keyword_opportunity"
            | "technical_issue";
          keyword?: string | null;
          threshold?: number | null;
          frequency?: "immediate" | "daily" | "weekly";
          is_active?: boolean;
          alert_config?: Json;
          last_triggered?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          team_id?: string;
          competitor_id?: string | null;
          alert_type?:
            | "ranking_change"
            | "traffic_change"
            | "new_content"
            | "keyword_opportunity"
            | "technical_issue";
          keyword?: string | null;
          threshold?: number | null;
          frequency?: "immediate" | "daily" | "weekly";
          is_active?: boolean;
          alert_config?: Json;
          last_triggered?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      competitor_analysis_results: {
        Row: {
          id: string;
          project_id: string;
          team_id: string;
          competitor_id: string;
          analysis_type:
            | "content_gap"
            | "keyword_overlap"
            | "backlink_analysis"
            | "technical_seo"
            | "performance_metrics"
            | "content_strategy";
          analysis_data: Json;
          confidence_score: number | null;
          generated_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          team_id: string;
          competitor_id: string;
          analysis_type:
            | "content_gap"
            | "keyword_overlap"
            | "backlink_analysis"
            | "technical_seo"
            | "performance_metrics"
            | "content_strategy";
          analysis_data?: Json;
          confidence_score?: number | null;
          generated_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          team_id?: string;
          competitor_id?: string;
          analysis_type?:
            | "content_gap"
            | "keyword_overlap"
            | "backlink_analysis"
            | "technical_seo"
            | "performance_metrics"
            | "content_strategy";
          analysis_data?: Json;
          confidence_score?: number | null;
          generated_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      competitor_tracking: {
        Row: {
          id: string;
          project_id: string;
          team_id: string;
          competitor_id: string;
          tracking_date: string;
          metrics: Json;
          rankings: Json;
          traffic_data: Json;
          content_count: number;
          backlink_count: number;
          domain_authority: number | null;
          page_authority: number | null;
          organic_keywords: number;
          paid_keywords: number;
          social_signals: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          team_id: string;
          competitor_id: string;
          tracking_date?: string;
          metrics?: Json;
          rankings?: Json;
          traffic_data?: Json;
          content_count?: number;
          backlink_count?: number;
          domain_authority?: number | null;
          page_authority?: number | null;
          organic_keywords?: number;
          paid_keywords?: number;
          social_signals?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          team_id?: string;
          competitor_id?: string;
          tracking_date?: string;
          metrics?: Json;
          rankings?: Json;
          traffic_data?: Json;
          content_count?: number;
          backlink_count?: number;
          domain_authority?: number | null;
          page_authority?: number | null;
          organic_keywords?: number;
          paid_keywords?: number;
          social_signals?: Json;
          created_at?: string;
        };
      };
      competitive_keywords: {
        Row: {
          id: string;
          project_id: string;
          team_id: string;
          keyword: string;
          search_volume: number;
          difficulty_score: number | null;
          cpc: number | null;
          competition_level:
            | Database["public"]["Enums"]["competition_level"]
            | null;
          trend_data: Json;
          our_position: number | null;
          our_url: string | null;
          competitors_data: Json;
          opportunity_score: number | null;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          team_id: string;
          keyword: string;
          search_volume?: number;
          difficulty_score?: number | null;
          cpc?: number | null;
          competition_level?:
            | Database["public"]["Enums"]["competition_level"]
            | null;
          trend_data?: Json;
          our_position?: number | null;
          our_url?: string | null;
          competitors_data?: Json;
          opportunity_score?: number | null;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          team_id?: string;
          keyword?: string;
          search_volume?: number;
          difficulty_score?: number | null;
          cpc?: number | null;
          competition_level?:
            | Database["public"]["Enums"]["competition_level"]
            | null;
          trend_data?: Json;
          our_position?: number | null;
          our_url?: string | null;
          competitors_data?: Json;
          opportunity_score?: number | null;
          last_updated?: string;
          created_at?: string;
        };
      };
      competitive_content_analysis: {
        Row: {
          id: string;
          project_id: string;
          team_id: string;
          competitor_id: string;
          content_url: string;
          content_title: string | null;
          content_type:
            | "blog_post"
            | "landing_page"
            | "product_page"
            | "category_page"
            | "guide"
            | "case_study"
            | "whitepaper"
            | "infographic"
            | "video"
            | "other"
            | null;
          word_count: number;
          readability_score: number | null;
          seo_score: number | null;
          target_keywords: string[];
          meta_title: string | null;
          meta_description: string | null;
          headings: Json;
          internal_links: number;
          external_links: number;
          images_count: number;
          social_shares: Json;
          estimated_traffic: number;
          content_freshness: string | null;
          analysis_data: Json;
          discovered_at: string;
          last_analyzed: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          team_id: string;
          competitor_id: string;
          content_url: string;
          content_title?: string | null;
          content_type?:
            | "blog_post"
            | "landing_page"
            | "product_page"
            | "category_page"
            | "guide"
            | "case_study"
            | "whitepaper"
            | "infographic"
            | "video"
            | "other"
            | null;
          word_count?: number;
          readability_score?: number | null;
          seo_score?: number | null;
          target_keywords?: string[];
          meta_title?: string | null;
          meta_description?: string | null;
          headings?: Json;
          internal_links?: number;
          external_links?: number;
          images_count?: number;
          social_shares?: Json;
          estimated_traffic?: number;
          content_freshness?: string | null;
          analysis_data?: Json;
          discovered_at?: string;
          last_analyzed?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          team_id?: string;
          competitor_id?: string;
          content_url?: string;
          content_title?: string | null;
          content_type?:
            | "blog_post"
            | "landing_page"
            | "product_page"
            | "category_page"
            | "guide"
            | "case_study"
            | "whitepaper"
            | "infographic"
            | "video"
            | "other"
            | null;
          word_count?: number;
          readability_score?: number | null;
          seo_score?: number | null;
          target_keywords?: string[];
          meta_title?: string | null;
          meta_description?: string | null;
          headings?: Json;
          internal_links?: number;
          external_links?: number;
          images_count?: number;
          social_shares?: Json;
          estimated_traffic?: number;
          content_freshness?: string | null;
          analysis_data?: Json;
          discovered_at?: string;
          last_analyzed?: string;
          created_at?: string;
        };
      };
      user_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          event_data: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          event_data?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          event_data?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      keyword_opportunities: {
        Row: {
          id: string;
          project_id: string;
          keyword: string;
          search_volume: number | null;
          difficulty_score: number | null;
          opportunity_score: number | null;
          current_ranking: number | null;
          target_ranking: number | null;
          competition_level: Database["public"]["Enums"]["competition_level"];
          trend_data: Json;
          last_updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          keyword: string;
          search_volume?: number | null;
          difficulty_score?: number | null;
          opportunity_score?: number | null;
          current_ranking?: number | null;
          target_ranking?: number | null;
          competition_level?: Database["public"]["Enums"]["competition_level"];
          trend_data?: Json;
          last_updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          keyword?: string;
          search_volume?: number | null;
          difficulty_score?: number | null;
          opportunity_score?: number | null;
          current_ranking?: number | null;
          target_ranking?: number | null;
          competition_level?: Database["public"]["Enums"]["competition_level"];
          trend_data?: Json;
          last_updated_at?: string;
          created_at?: string;
        };
      };
      analysis_results: {
        Row: {
          id: string;
          project_id: string;
          content_id: string | null;
          competitor_id: string | null;
          analysis_type: Database["public"]["Enums"]["analysis_type"];
          results: Json;
          confidence_score: number | null;
          generated_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          content_id?: string | null;
          competitor_id?: string | null;
          analysis_type: Database["public"]["Enums"]["analysis_type"];
          results?: Json;
          confidence_score?: number | null;
          generated_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          content_id?: string | null;
          competitor_id?: string | null;
          analysis_type?: Database["public"]["Enums"]["analysis_type"];
          results?: Json;
          confidence_score?: number | null;
          generated_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      content_analytics: {
        Row: {
          id: string;
          content_id: string;
          date: string;
          pageviews: number;
          unique_visitors: number;
          bounce_rate: number | null;
          avg_session_duration: number;
          conversions: number;
          conversion_rate: number | null;
          organic_traffic: number;
          backlinks_count: number;
          social_shares: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_id: string;
          date: string;
          pageviews?: number;
          unique_visitors?: number;
          bounce_rate?: number | null;
          avg_session_duration?: number;
          conversions?: number;
          conversion_rate?: number | null;
          organic_traffic?: number;
          backlinks_count?: number;
          social_shares?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_id?: string;
          date?: string;
          pageviews?: number;
          unique_visitors?: number;
          bounce_rate?: number | null;
          avg_session_duration?: number;
          conversions?: number;
          conversion_rate?: number | null;
          organic_traffic?: number;
          backlinks_count?: number;
          social_shares?: number;
          created_at?: string;
        };
      };
      competitor_analytics: {
        Row: {
          id: string;
          competitor_id: string;
          date: string;
          estimated_traffic: number;
          domain_authority: number | null;
          backlinks_count: number;
          referring_domains: number;
          top_keywords: string[];
          content_updates_count: number;
          new_content_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          competitor_id: string;
          date: string;
          estimated_traffic?: number;
          domain_authority?: number | null;
          backlinks_count?: number;
          referring_domains?: number;
          top_keywords?: string[];
          content_updates_count?: number;
          new_content_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          competitor_id?: string;
          date?: string;
          estimated_traffic?: number;
          domain_authority?: number | null;
          backlinks_count?: number;
          referring_domains?: number;
          top_keywords?: string[];
          content_updates_count?: number;
          new_content_count?: number;
          created_at?: string;
        };
      };
      content_recommendations: {
        Row: {
          id: string;
          project_id: string;
          content_id: string | null;
          recommendation_type: string;
          title: string;
          description: string;
          priority: number;
          estimated_impact: string;
          implementation_effort: string;
          data: Json;
          is_implemented: boolean;
          implemented_at: string | null;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          content_id?: string | null;
          recommendation_type: string;
          title: string;
          description: string;
          priority?: number;
          estimated_impact?: string;
          implementation_effort?: string;
          data?: Json;
          is_implemented?: boolean;
          implemented_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          content_id?: string | null;
          recommendation_type?: string;
          title?: string;
          description?: string;
          priority?: number;
          estimated_impact?: string;
          implementation_effort?: string;
          data?: Json;
          is_implemented?: boolean;
          implemented_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          old_values: Json | null;
          new_values: Json | null;
          user_id: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          old_values?: Json | null;
          new_values?: Json | null;
          user_id?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          user_id?: string | null;
          timestamp?: string;
        };
      };
    };
    Views: {
      index_usage_stats: {
        Row: {
          schemaname: string | null;
          tablename: string | null;
          indexname: string | null;
          times_used: number | null;
          tuples_read: number | null;
          tuples_fetched: number | null;
          index_size: string | null;
        };
      };
    };
    Functions: {
      create_team_with_owner: {
        Args: {
          team_name: string;
          team_description?: string;
          user_uuid?: string;
        };
        Returns: string;
      };
      invite_user_to_team: {
        Args: {
          team_uuid: string;
          user_email: string;
          user_role?: Database["public"]["Enums"]["user_role"];
        };
        Returns: string;
      };
      transfer_team_ownership: {
        Args: {
          team_uuid: string;
          new_owner_uuid: string;
        };
        Returns: boolean;
      };
      calculate_content_seo_score: {
        Args: {
          content_id_param: string;
        };
        Returns: number;
      };
      get_project_performance_summary: {
        Args: {
          project_uuid: string;
          start_date?: string;
          end_date?: string;
        };
        Returns: Array<{
          total_content: number;
          published_content: number;
          avg_seo_score: number;
          total_pageviews: number;
          total_organic_traffic: number;
          avg_bounce_rate: number;
          total_conversions: number;
        }>;
      };
      get_top_performing_content: {
        Args: {
          project_uuid: string;
          limit_count?: number;
          start_date?: string;
          end_date?: string;
        };
        Returns: Array<{
          content_id: string;
          title: string;
          url: string;
          total_pageviews: number;
          total_organic_traffic: number;
          avg_bounce_rate: number;
          conversions: number;
        }>;
      };
      has_team_access: {
        Args: {
          team_uuid: string;
          user_uuid: string;
        };
        Returns: boolean;
      };
      can_modify_team_resource: {
        Args: {
          team_uuid: string;
          user_uuid: string;
        };
        Returns: boolean;
      };
      is_team_owner: {
        Args: {
          team_uuid: string;
          user_uuid: string;
        };
        Returns: boolean;
      };
      cleanup_expired_analysis: {
        Args: Record<string, never>;
        Returns: number;
      };
      generate_sample_data_for_user: {
        Args: {
          user_uuid: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "owner" | "admin" | "member" | "viewer";
      project_status: "active" | "paused" | "archived" | "deleted";
      content_type:
        | "article"
        | "blog_post"
        | "landing_page"
        | "product_page"
        | "category_page"
        | "other";
      content_status: "draft" | "published" | "archived" | "deleted";
      analysis_type:
        | "content_seo"
        | "competitor_analysis"
        | "keyword_research"
        | "content_gap"
        | "performance_audit";
      competition_level: "low" | "medium" | "high" | "very_high";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Utility type for JSON columns
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Legacy compatibility types (for existing code)
export type DatabaseUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: "admin" | "editor" | "viewer";
  created_at: string;
  updated_at: string;
};
