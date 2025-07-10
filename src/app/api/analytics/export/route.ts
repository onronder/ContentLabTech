/**
 * Analytics Export API
 * Provides analytics data export functionality
 */

import { NextRequest } from "next/server";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

// GET /api/analytics/export - Export analytics data
export const GET = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    console.log("📊 Analytics Export request received");

    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    const timeRange = url.searchParams.get("timeRange") || "30d";
    const format = url.searchParams.get("format") || "json";

    try {
      // Mock analytics data for export
      const analyticsData = {
        summary: {
          totalProjects: 12,
          totalContent: 45,
          totalViews: 12500,
          totalEngagement: 3200,
          avgPerformance: 7.8,
          growthRate: 15.5,
          period: timeRange,
          generatedAt: new Date().toISOString(),
        },
        metrics: {
          pageViews: [
            { date: "2024-01-01", value: 1200 },
            { date: "2024-01-02", value: 1350 },
            { date: "2024-01-03", value: 1180 },
            { date: "2024-01-04", value: 1420 },
            { date: "2024-01-05", value: 1380 },
          ],
          engagement: [
            { date: "2024-01-01", clicks: 120, shares: 45, comments: 23 },
            { date: "2024-01-02", clicks: 135, shares: 52, comments: 28 },
            { date: "2024-01-03", clicks: 118, shares: 41, comments: 19 },
            { date: "2024-01-04", clicks: 142, shares: 58, comments: 31 },
            { date: "2024-01-05", clicks: 138, shares: 49, comments: 26 },
          ],
          contentPerformance: [
            {
              id: "content-1",
              title: "SEO Best Practices 2024",
              views: 2500,
              engagement: 320,
              conversionRate: 4.2,
              score: 8.5,
            },
            {
              id: "content-2",
              title: "Content Marketing Strategy",
              views: 1800,
              engagement: 245,
              conversionRate: 3.8,
              score: 7.9,
            },
            {
              id: "content-3",
              title: "Social Media Trends",
              views: 2200,
              engagement: 410,
              conversionRate: 5.1,
              score: 9.1,
            },
          ],
        },
        teamInsights: {
          teamId: teamId || "default-team",
          memberCount: 5,
          projectCount: 12,
          contentCreated: 45,
          averageScore: 7.8,
          topPerformers: [
            { userId: user.id, name: "Current User", score: 8.9 },
            { userId: "user-2", name: "Team Member 2", score: 8.2 },
            { userId: "user-3", name: "Team Member 3", score: 7.6 },
          ],
        },
      };

      // Handle different export formats
      if (format === "csv") {
        // Generate CSV format
        const csvData = generateCSV(analyticsData);
        return new Response(csvData, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="analytics-export-${timeRange}.csv"`,
          },
        });
      } else if (format === "excel") {
        // For Excel format, we'd typically use a library like xlsx
        // For now, return JSON with Excel mime type
        return new Response(JSON.stringify(analyticsData), {
          status: 200,
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="analytics-export-${timeRange}.xlsx"`,
          },
        });
      } else {
        // Default JSON format
        return new Response(
          JSON.stringify({
            success: true,
            data: analyticsData,
            exportOptions: {
              teamId,
              timeRange,
              format,
              generatedAt: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      console.error("❌ Error exporting analytics:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to export analytics",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
);

// Helper function to generate CSV data
function generateCSV(data: any): string {
  const lines = [];

  // Add header
  lines.push("Export Summary");
  lines.push(`Generated At,${data.summary.generatedAt}`);
  lines.push(`Team ID,${data.teamInsights.teamId}`);
  lines.push(`Time Range,${data.summary.period}`);
  lines.push("");

  // Add metrics summary
  lines.push("Metrics Summary");
  lines.push("Metric,Value");
  lines.push(`Total Projects,${data.summary.totalProjects}`);
  lines.push(`Total Content,${data.summary.totalContent}`);
  lines.push(`Total Views,${data.summary.totalViews}`);
  lines.push(`Total Engagement,${data.summary.totalEngagement}`);
  lines.push(`Average Performance,${data.summary.avgPerformance}`);
  lines.push(`Growth Rate,${data.summary.growthRate}%`);
  lines.push("");

  // Add content performance
  lines.push("Content Performance");
  lines.push("Title,Views,Engagement,Conversion Rate,Score");
  data.metrics.contentPerformance.forEach((content: any) => {
    lines.push(
      `${content.title},${content.views},${content.engagement},${content.conversionRate}%,${content.score}`
    );
  });

  return lines.join("\n");
}
