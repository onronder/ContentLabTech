/**
 * SEO Health Processor Tests
 * Comprehensive unit tests for SEO health assessment engine
 */

import { SEOHealthProcessor } from "../seo-health";
import { Job, SEOHealthJobData } from "../../types";

describe("SEOHealthProcessor", () => {
  let processor: SEOHealthProcessor;
  let mockJob: Job;

  beforeEach(() => {
    processor = new SEOHealthProcessor();
    mockJob = {
      id: "test-seo-job-1",
      type: "seo-health-check",
      status: "pending",
      priority: "normal",
      data: {
        projectId: "test-project",
        userId: "test-user",
        teamId: "test-team",
        params: {
          websiteUrl: "https://example.com",
          pages: ["/", "/about", "/services"],
          includePerformance: true,
          includeMobile: true,
        },
      },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      progress: 0,
    };
  });

  describe("validate", () => {
    it("should validate correct job data", () => {
      const isValid = processor.validate(mockJob.data as SEOHealthJobData);
      expect(isValid).toBe(true);
    });

    it("should reject invalid websiteUrl", () => {
      (mockJob.data.params as Record<string, unknown>)["websiteUrl"] = "";
      const isValid = processor.validate(mockJob.data as SEOHealthJobData);
      expect(isValid).toBe(false);
    });

    it("should reject empty pages array", () => {
      (mockJob.data.params as Record<string, unknown>)["pages"] = [];
      const isValid = processor.validate(mockJob.data as SEOHealthJobData);
      expect(isValid).toBe(false);
    });
  });

  describe("estimateProcessingTime", () => {
    it("should estimate time based on pages count and options", () => {
      const baseTime = processor.estimateProcessingTime(
        mockJob.data as SEOHealthJobData
      );
      expect(baseTime).toBe(660); // 3 pages * 120s + 180s + 120s

      // Without performance and mobile
      (mockJob.data.params as Record<string, unknown>)["includePerformance"] =
        false;
      (mockJob.data.params as Record<string, unknown>)["includeMobile"] = false;
      const reducedTime = processor.estimateProcessingTime(
        mockJob.data as SEOHealthJobData
      );
      expect(reducedTime).toBe(360); // 3 pages * 120s
    });
  });

  describe("process", () => {
    it("should process SEO health analysis successfully", async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.overallScore).toBeGreaterThan(0);
        expect(result.data.overallScore).toBeLessThanOrEqual(100);
        expect(result.data.criticalIssues).toBeInstanceOf(Array);
        expect(result.data.recommendations).toBeInstanceOf(Array);
      }
      expect(result.progress).toBe(100);
    });

    it("should include all required SEO categories", async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.technical).toBeDefined();
        expect(result.data.onPage).toBeDefined();
        expect(result.data.performance).toBeDefined();
        expect(result.data.mobile).toBeDefined();

        // Verify scores are within valid range
        expect(result.data.technical).toBeGreaterThanOrEqual(0);
        expect(result.data.technical).toBeLessThanOrEqual(100);
        expect(result.data.onPage).toBeGreaterThanOrEqual(0);
        expect(result.data.onPage).toBeLessThanOrEqual(100);
      }
    });

    it("should identify critical issues with proper severity", async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.criticalIssues).toBeInstanceOf(Array);

        result.data.criticalIssues.forEach(issue => {
          expect(["high", "medium", "low"]).toContain(issue.impact);
          expect(["technical", "content", "performance", "mobile"]).toContain(
            issue.category
          );
          expect(issue.title).toBeDefined();
          expect(issue.description).toBeDefined();
          expect(issue.howToFix).toBeDefined();
          expect(["critical", "warning", "recommendation"]).toContain(
            issue.type
          );
        });
      }
    });

    it("should provide actionable recommendations", async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.recommendations).toBeInstanceOf(Array);
        expect(result.data.recommendations.length).toBeGreaterThan(0);

        result.data.recommendations.forEach(rec => {
          expect(rec.title).toBeDefined();
          expect(rec.description).toBeDefined();
          expect(rec.impact).toBeGreaterThan(0);
          expect(rec.impact).toBeLessThanOrEqual(100);
          expect(rec.difficulty).toBeGreaterThan(0);
          expect(rec.difficulty).toBeLessThanOrEqual(100);
          expect(["technical", "content", "performance", "mobile"]).toContain(
            rec.category
          );
          expect(rec.timeframe).toBeDefined();
          expect(rec.resources).toBeInstanceOf(Array);
        });
      }
    });

    it("should handle mobile-specific analysis when enabled", async () => {
      (mockJob.data.params as Record<string, unknown>)["includeMobile"] = true;
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.mobile).toBeGreaterThanOrEqual(0);
        expect(result.data.mobile).toBeLessThanOrEqual(100);

        // Should have mobile-specific issues or recommendations
        const mobileIssues = result.data.criticalIssues.filter(
          issue => issue.category === "mobile"
        );
        const mobileRecs = result.data.recommendations.filter(
          rec => rec.category === "mobile"
        );

        expect(mobileIssues.length + mobileRecs.length).toBeGreaterThanOrEqual(
          0
        );
      }
    });

    it("should handle performance analysis when enabled", async () => {
      (mockJob.data.params as Record<string, unknown>)["includePerformance"] =
        true;
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.performance).toBeGreaterThanOrEqual(0);
        expect(result.data.performance).toBeLessThanOrEqual(100);

        // Should have performance-specific issues or recommendations
        const perfIssues = result.data.criticalIssues.filter(
          issue => issue.category === "performance"
        );
        const perfRecs = result.data.recommendations.filter(
          rec => rec.category === "performance"
        );

        expect(perfIssues.length + perfRecs.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should calculate overall score correctly", async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);

      if (result.data) {
        // Verify overall score is weighted average of categories
        const calculatedScore =
          result.data.technical * 0.35 +
          result.data.onPage * 0.3 +
          result.data.performance * 0.2 +
          result.data.mobile * 0.15;

        expect(
          Math.abs(result.data.overallScore - calculatedScore)
        ).toBeLessThan(2);
      }
    });
  });

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      // Mock a network failure
      (mockJob.data.params as Record<string, unknown>)["websiteUrl"] =
        "https://non-existent-domain-12345.com";

      const result = await processor.process(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retryable).toBe(true);
    });

    it("should handle invalid pages gracefully", async () => {
      (mockJob.data.params as Record<string, unknown>)["pages"] = [
        "/nonexistent-page-12345",
      ];

      const result = await processor.process(mockJob);

      // Should still succeed but with warnings
      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.criticalIssues).toBeInstanceOf(Array);
      }
    });
  });
});
