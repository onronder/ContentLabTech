/**
 * Advanced Alert Prioritization Engine
 * Sophisticated algorithms for competitive intelligence alert prioritization and delivery
 */

import { z } from "zod";
import type { CompetitiveAlert } from "@/lib/competitive/types";

// Alert prioritization configuration
const alertConfigSchema = z.object({
  weights: z.object({
    severity: z.number().min(0).max(1).default(0.4),
    impact: z.number().min(0).max(1).default(0.3),
    urgency: z.number().min(0).max(1).default(0.2),
    confidence: z.number().min(0).max(1).default(0.1),
  }),
  severityScores: z.object({
    critical: z.number().default(100),
    high: z.number().default(80),
    medium: z.number().default(60),
    low: z.number().default(40),
    info: z.number().default(20),
  }),
  thresholds: z.object({
    criticalAlert: z.number().default(85),
    highPriorityAlert: z.number().default(70),
    mediumPriorityAlert: z.number().default(50),
    lowPriorityAlert: z.number().default(30),
  }),
  businessHours: z.object({
    start: z.number().min(0).max(23).default(9), // 9 AM
    end: z.number().min(0).max(23).default(17), // 5 PM
    timezone: z.string().default("UTC"),
  }),
});

type AlertConfig = z.infer<typeof alertConfigSchema>;

// Enhanced alert with prioritization metadata
export interface PrioritizedAlert extends CompetitiveAlert {
  priorityScore: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
  deliveryChannel: ("dashboard" | "email" | "slack" | "sms")[];
  scheduledDelivery?: Date;
  escalationLevel: number;
  businessContext: {
    strategicImpact: number;
    resourceRequirement: "low" | "medium" | "high";
    timeToAction: number; // hours
    competitorThreatLevel: number;
  };
}

// Alert delivery preferences
export interface AlertDeliveryPreferences {
  userId: string;
  channels: {
    dashboard: { enabled: boolean; };
    email: { 
      enabled: boolean; 
      address: string;
      frequency: "immediate" | "hourly" | "daily";
      minimumPriority: "critical" | "high" | "medium" | "low";
    };
    slack: { 
      enabled: boolean; 
      webhook?: string;
      channel?: string;
      minimumPriority: "critical" | "high" | "medium" | "low";
    };
    sms: { 
      enabled: boolean; 
      phoneNumber?: string;
      minimumPriority: "critical" | "high";
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
  keywords: {
    highPriority: string[];
    blocked: string[];
  };
}

// Alert clustering for batch notifications
export interface AlertCluster {
  id: string;
  category: "content" | "seo" | "performance" | "market" | "mixed";
  alerts: PrioritizedAlert[];
  summary: string;
  aggregatedPriority: number;
  recommendedAction: string;
  timeWindow: { start: Date; end: Date };
}

export class AlertPrioritizationEngine {
  private config: AlertConfig;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = alertConfigSchema.parse(config);
  }

  /**
   * Calculate priority score for a competitive alert
   */
  calculatePriorityScore(alert: CompetitiveAlert): number {
    const severityScore = this.config.severityScores[alert.severity];
    const impactScore = alert.metadata.impact;
    const urgencyScore = alert.metadata.urgency;
    const confidenceScore = alert.metadata.confidence;

    // Weighted calculation
    const weightedScore = 
      (severityScore * this.config.weights.severity) +
      (impactScore * this.config.weights.impact) +
      (urgencyScore * this.config.weights.urgency) +
      (confidenceScore * this.config.weights.confidence);

    // Apply business context modifiers
    let modifier = 1.0;

    // Time sensitivity modifier
    const hoursSinceAlert = (Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceAlert < 1 && alert.severity === "critical") {
      modifier += 0.2; // Boost for recent critical alerts
    } else if (hoursSinceAlert > 24) {
      modifier -= 0.1; // Reduce for old alerts
    }

    // Alert type modifier
    switch (alert.type) {
      case "threat-detected":
        modifier += 0.15;
        break;
      case "ranking-change":
        modifier += 0.1;
        break;
      case "opportunity-identified":
        modifier += 0.05;
        break;
      case "content-published":
        modifier += 0.02;
        break;
    }

    // Action required modifier
    if (alert.actionRequired) {
      modifier += 0.1;
    }

    return Math.min(100, Math.max(0, weightedScore * modifier));
  }

  /**
   * Determine priority level based on score
   */
  getPriorityLevel(score: number): "critical" | "high" | "medium" | "low" {
    if (score >= this.config.thresholds.criticalAlert) return "critical";
    if (score >= this.config.thresholds.highPriorityAlert) return "high";
    if (score >= this.config.thresholds.mediumPriorityAlert) return "medium";
    return "low";
  }

  /**
   * Calculate business context for alert
   */
  calculateBusinessContext(alert: CompetitiveAlert): PrioritizedAlert["businessContext"] {
    // Strategic impact calculation
    let strategicImpact = alert.metadata.impact;

    // Adjust based on alert type
    switch (alert.type) {
      case "threat-detected":
        strategicImpact = Math.min(100, strategicImpact * 1.3);
        break;
      case "market-movement":
        strategicImpact = Math.min(100, strategicImpact * 1.2);
        break;
      case "opportunity-identified":
        strategicImpact = Math.min(100, strategicImpact * 1.1);
        break;
    }

    // Resource requirement assessment
    let resourceRequirement: "low" | "medium" | "high" = "medium";
    if (alert.recommendations.length === 0) {
      resourceRequirement = "low";
    } else if (alert.recommendations.some(r => r.effort === "high")) {
      resourceRequirement = "high";
    } else if (alert.recommendations.some(r => r.effort === "medium")) {
      resourceRequirement = "medium";
    } else {
      resourceRequirement = "low";
    }

    // Time to action (hours)
    let timeToAction = 48; // Default 48 hours
    switch (alert.severity) {
      case "critical":
        timeToAction = 2;
        break;
      case "high":
        timeToAction = 8;
        break;
      case "medium":
        timeToAction = 24;
        break;
      case "low":
        timeToAction = 72;
        break;
    }

    // Apply urgency modifier
    timeToAction = timeToAction * (100 - alert.metadata.urgency) / 100;

    // Competitor threat level
    const competitorThreatLevel = this.calculateCompetitorThreatLevel(alert);

    return {
      strategicImpact,
      resourceRequirement,
      timeToAction,
      competitorThreatLevel,
    };
  }

  /**
   * Calculate competitor threat level
   */
  private calculateCompetitorThreatLevel(alert: CompetitiveAlert): number {
    let threatLevel = 50; // Base level

    switch (alert.type) {
      case "threat-detected":
        threatLevel = 90;
        break;
      case "ranking-change":
        threatLevel = 70;
        break;
      case "backlink-gained":
        threatLevel = 60;
        break;
      case "strategy-shift":
        threatLevel = 75;
        break;
      case "performance-improvement":
        threatLevel = 65;
        break;
      case "content-published":
        threatLevel = 40;
        break;
      case "opportunity-identified":
        threatLevel = 30;
        break;
      default:
        threatLevel = 50;
    }

    // Adjust based on alert metadata
    if (alert.metadata.data?.competitorRanking) {
      const ranking = alert.metadata.data.competitorRanking as number;
      if (ranking <= 3) threatLevel += 20;
      else if (ranking <= 10) threatLevel += 10;
    }

    if (alert.metadata.data?.searchVolume) {
      const volume = alert.metadata.data.searchVolume as number;
      if (volume > 50000) threatLevel += 15;
      else if (volume > 10000) threatLevel += 10;
      else if (volume > 1000) threatLevel += 5;
    }

    return Math.min(100, Math.max(0, threatLevel));
  }

  /**
   * Determine delivery channels based on priority and preferences
   */
  getDeliveryChannels(
    priorityLevel: "critical" | "high" | "medium" | "low",
    preferences: AlertDeliveryPreferences
  ): ("dashboard" | "email" | "slack" | "sms")[] {
    const channels: ("dashboard" | "email" | "slack" | "sms")[] = [];

    // Dashboard is always enabled
    if (preferences.channels.dashboard.enabled) {
      channels.push("dashboard");
    }

    // Email delivery
    if (preferences.channels.email.enabled) {
      const emailMinPriority = preferences.channels.email.minimumPriority;
      if (this.shouldDeliver(priorityLevel, emailMinPriority)) {
        channels.push("email");
      }
    }

    // Slack delivery
    if (preferences.channels.slack.enabled) {
      const slackMinPriority = preferences.channels.slack.minimumPriority;
      if (this.shouldDeliver(priorityLevel, slackMinPriority)) {
        channels.push("slack");
      }
    }

    // SMS delivery (only for critical and high priority)
    if (preferences.channels.sms.enabled && 
        (priorityLevel === "critical" || priorityLevel === "high")) {
      const smsMinPriority = preferences.channels.sms.minimumPriority;
      if (this.shouldDeliver(priorityLevel, smsMinPriority)) {
        channels.push("sms");
      }
    }

    return channels;
  }

  /**
   * Check if alert should be delivered based on priority threshold
   */
  private shouldDeliver(
    alertPriority: "critical" | "high" | "medium" | "low",
    minimumPriority: "critical" | "high" | "medium" | "low"
  ): boolean {
    const priorityOrder = { "critical": 4, "high": 3, "medium": 2, "low": 1 };
    return priorityOrder[alertPriority] >= priorityOrder[minimumPriority];
  }

  /**
   * Schedule delivery based on preferences and business hours
   */
  scheduleDelivery(
    alert: PrioritizedAlert,
    preferences: AlertDeliveryPreferences
  ): Date | undefined {
    const now = new Date();

    // Critical alerts are always delivered immediately
    if (alert.priorityLevel === "critical") {
      return now;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const isQuietHours = this.isInQuietHours(now, preferences.quietHours);
      
      if (isQuietHours) {
        // Schedule for end of quiet hours unless it's high priority
        if (alert.priorityLevel === "high") {
          return now; // Deliver high priority even during quiet hours
        } else {
          return this.getNextBusinessHour(now, preferences.quietHours);
        }
      }
    }

    // Check email frequency preference
    const emailChannel = alert.deliveryChannel.includes("email");
    if (emailChannel && preferences.channels.email.frequency !== "immediate") {
      return this.getNextScheduledTime(now, preferences.channels.email.frequency);
    }

    return now; // Immediate delivery
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(
    time: Date,
    quietHours: AlertDeliveryPreferences["quietHours"]
  ): boolean {
    if (!quietHours.enabled) return false;

    const timeString = time.toLocaleTimeString("en-US", { 
      hour12: false,
      timeZone: quietHours.timezone 
    }).slice(0, 5);
    
    return timeString >= quietHours.start && timeString <= quietHours.end;
  }

  /**
   * Get next business hour after quiet period
   */
  private getNextBusinessHour(
    time: Date,
    quietHours: AlertDeliveryPreferences["quietHours"]
  ): Date {
    const nextDay = new Date(time);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const [hours, minutes] = quietHours.end.split(":").map(Number);
    nextDay.setHours(hours, minutes, 0, 0);
    
    return nextDay;
  }

  /**
   * Get next scheduled time based on frequency
   */
  private getNextScheduledTime(
    time: Date,
    frequency: "immediate" | "hourly" | "daily"
  ): Date {
    const scheduled = new Date(time);
    
    switch (frequency) {
      case "hourly":
        scheduled.setHours(scheduled.getHours() + 1, 0, 0, 0);
        break;
      case "daily":
        scheduled.setDate(scheduled.getDate() + 1);
        scheduled.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      default:
        return time; // immediate
    }
    
    return scheduled;
  }

  /**
   * Process and prioritize multiple alerts
   */
  prioritizeAlerts(
    alerts: CompetitiveAlert[],
    preferences: AlertDeliveryPreferences
  ): PrioritizedAlert[] {
    return alerts
      .map(alert => {
        const priorityScore = this.calculatePriorityScore(alert);
        const priorityLevel = this.getPriorityLevel(priorityScore);
        const businessContext = this.calculateBusinessContext(alert);
        const deliveryChannel = this.getDeliveryChannels(priorityLevel, preferences);

        const prioritizedAlert: PrioritizedAlert = {
          ...alert,
          priorityScore,
          priorityLevel,
          deliveryChannel,
          escalationLevel: 0,
          businessContext,
        };

        prioritizedAlert.scheduledDelivery = this.scheduleDelivery(prioritizedAlert, preferences);

        return prioritizedAlert;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore); // Sort by priority score descending
  }

  /**
   * Cluster related alerts for batch notifications
   */
  clusterAlerts(alerts: PrioritizedAlert[], timeWindowHours: number = 1): AlertCluster[] {
    const clusters: AlertCluster[] = [];
    const processedAlerts = new Set<string>();

    alerts.forEach(alert => {
      if (processedAlerts.has(alert.id)) return;

      const relatedAlerts = alerts.filter(otherAlert => 
        !processedAlerts.has(otherAlert.id) &&
        this.areAlertsRelated(alert, otherAlert, timeWindowHours)
      );

      if (relatedAlerts.length > 1) {
        const cluster = this.createAlertCluster(relatedAlerts, timeWindowHours);
        clusters.push(cluster);
        
        relatedAlerts.forEach(a => processedAlerts.add(a.id));
      } else {
        processedAlerts.add(alert.id);
      }
    });

    return clusters.sort((a, b) => b.aggregatedPriority - a.aggregatedPriority);
  }

  /**
   * Check if two alerts are related and should be clustered
   */
  private areAlertsRelated(
    alert1: PrioritizedAlert,
    alert2: PrioritizedAlert,
    timeWindowHours: number
  ): boolean {
    // Time proximity check
    const timeDiff = Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime());
    const maxTimeDiff = timeWindowHours * 60 * 60 * 1000;
    
    if (timeDiff > maxTimeDiff) return false;

    // Same competitor
    if (alert1.competitorId === alert2.competitorId) return true;

    // Same alert type
    if (alert1.type === alert2.type) return true;

    // Related keywords/entities
    const alert1Entities = alert1.metadata.relatedEntities || [];
    const alert2Entities = alert2.metadata.relatedEntities || [];
    const sharedEntities = alert1Entities.filter(e => alert2Entities.includes(e));
    
    return sharedEntities.length > 0;
  }

  /**
   * Create an alert cluster from related alerts
   */
  private createAlertCluster(
    alerts: PrioritizedAlert[],
    timeWindowHours: number
  ): AlertCluster {
    const category = this.determineClusterCategory(alerts);
    const aggregatedPriority = this.calculateAggregatedPriority(alerts);
    const summary = this.generateClusterSummary(alerts, category);
    const recommendedAction = this.generateClusterAction(alerts, category);

    const timestamps = alerts.map(a => a.timestamp.getTime());
    const timeWindow = {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };

    return {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      alerts,
      summary,
      aggregatedPriority,
      recommendedAction,
      timeWindow,
    };
  }

  /**
   * Determine the category of an alert cluster
   */
  private determineClusterCategory(alerts: PrioritizedAlert[]): AlertCluster["category"] {
    const types = alerts.map(a => a.type);
    const uniqueTypes = [...new Set(types)];

    if (uniqueTypes.length === 1) {
      switch (uniqueTypes[0]) {
        case "content-published":
          return "content";
        case "ranking-change":
        case "backlink-gained":
          return "seo";
        case "performance-improvement":
          return "performance";
        case "market-movement":
        case "threat-detected":
          return "market";
        default:
          return "mixed";
      }
    }

    return "mixed";
  }

  /**
   * Calculate aggregated priority for a cluster
   */
  private calculateAggregatedPriority(alerts: PrioritizedAlert[]): number {
    if (alerts.length === 0) return 0;

    // Use weighted average with higher weight for higher priority alerts
    const weightedSum = alerts.reduce((sum, alert) => {
      const weight = alert.priorityScore / 100;
      return sum + (alert.priorityScore * weight);
    }, 0);

    const totalWeight = alerts.reduce((sum, alert) => sum + (alert.priorityScore / 100), 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate summary for alert cluster
   */
  private generateClusterSummary(
    alerts: PrioritizedAlert[],
    category: AlertCluster["category"]
  ): string {
    const count = alerts.length;
    const competitors = [...new Set(alerts.map(a => a.competitorId))];
    const competitorCount = competitors.length;

    switch (category) {
      case "content":
        return `${count} content-related alerts from ${competitorCount} competitor(s)`;
      case "seo":
        return `${count} SEO changes detected across ${competitorCount} competitor(s)`;
      case "performance":
        return `${count} performance improvements by ${competitorCount} competitor(s)`;
      case "market":
        return `${count} market movements affecting ${competitorCount} competitor(s)`;
      default:
        return `${count} competitive alerts from ${competitorCount} competitor(s)`;
    }
  }

  /**
   * Generate recommended action for alert cluster
   */
  private generateClusterAction(
    alerts: PrioritizedAlert[],
    category: AlertCluster["category"]
  ): string {
    const highPriorityCount = alerts.filter(a => a.priorityLevel === "critical" || a.priorityLevel === "high").length;

    if (highPriorityCount > 0) {
      switch (category) {
        case "content":
          return "Review competitor content strategy and identify content gaps";
        case "seo":
          return "Analyze SEO changes and update your optimization strategy";
        case "performance":
          return "Benchmark performance improvements and implement similar optimizations";
        case "market":
          return "Assess market impact and adjust strategic positioning";
        default:
          return "Review all alerts and prioritize strategic response";
      }
    }

    return "Monitor developments and assess for potential strategic implications";
  }
}

// Export singleton instance with default configuration
export const alertPrioritizationEngine = new AlertPrioritizationEngine();

// Export types
export type { AlertConfig, PrioritizedAlert, AlertDeliveryPreferences, AlertCluster };