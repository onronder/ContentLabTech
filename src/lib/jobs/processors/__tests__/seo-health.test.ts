/**
 * SEO Health Processor Tests
 * Comprehensive unit tests for SEO health assessment engine
 */

import { SEOHealthProcessor } from '../seo-health';
import { Job } from '../../types';

describe('SEOHealthProcessor', () => {
  let processor: SEOHealthProcessor;
  let mockJob: Job;

  beforeEach(() => {
    processor = new SEOHealthProcessor();
    mockJob = {
      id: 'test-seo-job-1',
      type: 'seo-health-check',
      status: 'pending',
      priority: 'normal',
      data: {
        projectId: 'test-project',
        userId: 'test-user',
        teamId: 'test-team',
        params: {
          websiteUrl: 'https://example.com',
          pages: ['/', '/about', '/services'],
          includePerformance: true,
          includeMobile: true
        }
      },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      progress: 0
    };
  });

  describe('validate', () => {
    it('should validate correct job data', () => {
      const isValid = processor.validate(mockJob.data);
      expect(isValid).toBe(true);
    });

    it('should reject invalid websiteUrl', () => {
      mockJob.data.params.websiteUrl = 'not-a-url';
      const isValid = processor.validate(mockJob.data);
      expect(isValid).toBe(false);
    });

    it('should reject empty pages array', () => {
      mockJob.data.params.pages = [];
      const isValid = processor.validate(mockJob.data);
      expect(isValid).toBe(false);
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate time based on pages count and options', () => {
      const baseTime = processor.estimateProcessingTime(mockJob.data);
      expect(baseTime).toBe(180); // 3 minutes for 3 pages + performance + mobile

      // Without performance and mobile
      mockJob.data.params.includePerformance = false;
      mockJob.data.params.includeMobile = false;
      const reducedTime = processor.estimateProcessingTime(mockJob.data);
      expect(reducedTime).toBe(90); // 30 seconds per page only
    });
  });

  describe('process', () => {
    it('should process SEO health analysis successfully', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.overallScore).toBeGreaterThan(0);
      expect(result.data.overallScore).toBeLessThanOrEqual(100);
      expect(result.data.criticalIssues).toBeInstanceOf(Array);
      expect(result.data.recommendations).toBeInstanceOf(Array);
      expect(result.progress).toBe(100);
    });

    it('should include all required SEO categories', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.technical).toBeDefined();
      expect(result.data.onPage).toBeDefined();
      expect(result.data.performance).toBeDefined();
      expect(result.data.mobile).toBeDefined();

      // Verify scores are within valid range
      expect(result.data.technical).toBeGreaterThanOrEqual(0);
      expect(result.data.technical).toBeLessThanOrEqual(100);
      expect(result.data.onPage).toBeGreaterThanOrEqual(0);
      expect(result.data.onPage).toBeLessThanOrEqual(100);
    });

    it('should identify critical issues with proper severity', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.criticalIssues).toBeInstanceOf(Array);

      result.data.criticalIssues.forEach(issue => {
        expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
        expect(['technical', 'content', 'structure', 'performance', 'mobile']).toContain(issue.type);
        expect(issue.title).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(issue.recommendation).toBeDefined();
        expect(issue.impact).toBeGreaterThan(0);
        expect(issue.impact).toBeLessThanOrEqual(100);
      });
    });

    it('should provide actionable recommendations', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.recommendations).toBeInstanceOf(Array);
      expect(result.data.recommendations.length).toBeGreaterThan(0);

      result.data.recommendations.forEach(rec => {
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.impact).toBeGreaterThan(0);
        expect(rec.impact).toBeLessThanOrEqual(100);
        expect(['low', 'medium', 'high']).toContain(rec.effort);
        expect(['technical', 'content', 'performance', 'mobile']).toContain(rec.category);
        expect(rec.implementation).toBeDefined();
        expect(rec.implementation.steps).toBeInstanceOf(Array);
        expect(rec.implementation.timeEstimate).toBeDefined();
      });
    });

    it('should handle mobile-specific analysis when enabled', async () => {
      mockJob.data.params.includeMobile = true;
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.mobile).toBeGreaterThanOrEqual(0);
      expect(result.data.mobile).toBeLessThanOrEqual(100);

      // Should have mobile-specific issues or recommendations
      const mobileIssues = result.data.criticalIssues.filter(issue => issue.type === 'mobile');
      const mobileRecs = result.data.recommendations.filter(rec => rec.category === 'mobile');
      
      expect(mobileIssues.length + mobileRecs.length).toBeGreaterThan(0);
    });

    it('should handle performance analysis when enabled', async () => {
      mockJob.data.params.includePerformance = true;
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.performance).toBeGreaterThanOrEqual(0);
      expect(result.data.performance).toBeLessThanOrEqual(100);

      // Should have performance-specific issues or recommendations
      const perfIssues = result.data.criticalIssues.filter(issue => issue.type === 'performance');
      const perfRecs = result.data.recommendations.filter(rec => rec.category === 'performance');
      
      expect(perfIssues.length + perfRecs.length).toBeGreaterThan(0);
    });

    it('should calculate overall score correctly', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      
      // Verify overall score is weighted average of categories
      const calculatedScore = (
        result.data.technical * 0.35 +
        result.data.onPage * 0.30 +
        result.data.performance * 0.25 +
        result.data.mobile * 0.10
      );

      expect(Math.abs(result.data.overallScore - calculatedScore)).toBeLessThan(2);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock a network failure
      mockJob.data.params.websiteUrl = 'https://non-existent-domain-12345.com';
      
      const result = await processor.process(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retryable).toBe(true);
    });

    it('should handle invalid pages gracefully', async () => {
      mockJob.data.params.pages = ['/nonexistent-page-12345'];
      
      const result = await processor.process(mockJob);

      // Should still succeed but with warnings
      expect(result.success).toBe(true);
      expect(result.data.criticalIssues).toBeInstanceOf(Array);
    });
  });
});