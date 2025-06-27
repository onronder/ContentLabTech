/**
 * Content Analysis Processor Tests
 * Comprehensive unit tests for content quality assessment engine
 */

import { ContentAnalysisProcessor } from '../content-analysis';
import { Job } from '../../types';

// Mock external dependencies
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                wordCount: 1500,
                headingStructure: 85,
                keywordDensity: 2.5,
                contentGaps: ['technical depth', 'case studies'],
                topicCoverage: 78
              })
            }
          }]
        })
      }
    }
  }))
}));

describe('ContentAnalysisProcessor', () => {
  let processor: ContentAnalysisProcessor;
  let mockJob: Job;

  beforeEach(() => {
    processor = new ContentAnalysisProcessor();
    mockJob = {
      id: 'test-job-1',
      type: 'content-analysis',
      status: 'pending',
      priority: 'normal',
      data: {
        projectId: 'test-project',
        userId: 'test-user',
        teamId: 'test-team',
        params: {
          websiteUrl: 'https://example.com',
          targetKeywords: ['content marketing', 'SEO optimization'],
          analysisDepth: 'comprehensive'
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
      mockJob.data.params.websiteUrl = 'invalid-url';
      const isValid = processor.validate(mockJob.data);
      expect(isValid).toBe(false);
    });

    it('should reject missing target keywords', () => {
      mockJob.data.params.targetKeywords = [];
      const isValid = processor.validate(mockJob.data);
      expect(isValid).toBe(false);
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate processing time based on analysis depth', () => {
      // Basic analysis
      mockJob.data.params.analysisDepth = 'basic';
      const basicTime = processor.estimateProcessingTime(mockJob.data);
      expect(basicTime).toBe(120); // 2 minutes

      // Comprehensive analysis
      mockJob.data.params.analysisDepth = 'comprehensive';
      const comprehensiveTime = processor.estimateProcessingTime(mockJob.data);
      expect(comprehensiveTime).toBe(300); // 5 minutes

      // Enterprise analysis
      mockJob.data.params.analysisDepth = 'enterprise';
      const enterpriseTime = processor.estimateProcessingTime(mockJob.data);
      expect(enterpriseTime).toBe(600); // 10 minutes
    });
  });

  describe('process', () => {
    it('should process content analysis successfully', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.overallScore).toBeGreaterThan(0);
      expect(result.data.overallScore).toBeLessThanOrEqual(100);
      expect(result.data.recommendations).toBeInstanceOf(Array);
      expect(result.progress).toBe(100);
    });

    it('should apply correct weightings according to Phase 1 algorithm', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.technicalSeo).toBeDefined();
      expect(result.data.contentDepth).toBeDefined();
      expect(result.data.readability).toBeDefined();
      expect(result.data.semanticRelevance).toBeDefined();

      // Verify weighting: Technical SEO 30%, Content Depth 40%, Readability 20%, Semantic Relevance 10%
      const calculatedScore = (
        result.data.technicalSeo * 0.30 +
        result.data.contentDepth * 0.40 +
        result.data.readability * 0.20 +
        result.data.semanticRelevance * 0.10
      );

      expect(Math.abs(result.data.overallScore - calculatedScore)).toBeLessThan(1);
    });

    it('should include recommendations with proper priority classification', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.recommendations.length).toBeGreaterThan(0);

      result.data.recommendations.forEach(rec => {
        expect(['high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.implementation).toBeDefined();
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock OpenAI to throw an error
      const mockError = new Error('API rate limit exceeded');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      jest.mocked(require('openai').OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(mockError)
          }
        }
      }));

      const result = await processor.process(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retryable).toBe(true);
    });
  });

  describe('content quality scoring', () => {
    it('should score technical SEO factors correctly', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.technicalSeo).toBeGreaterThanOrEqual(0);
      expect(result.data.technicalSeo).toBeLessThanOrEqual(100);
    });

    it('should identify content gaps accurately', async () => {
      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.data.contentGaps).toBeInstanceOf(Array);
      
      result.data.contentGaps.forEach(gap => {
        expect(gap.topic).toBeDefined();
        expect(gap.importance).toBeGreaterThan(0);
        expect(['easy', 'medium', 'hard']).toContain(gap.difficulty);
        expect(gap.estimatedWordCount).toBeGreaterThan(0);
      });
    });
  });
});