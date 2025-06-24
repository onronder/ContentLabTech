/**
 * OpenAI API Integration for AI-Powered Content Analysis
 * Provides intelligent content optimization and insights
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for AI analysis
export interface ContentAnalysisInput {
  title: string;
  content: string;
  metaDescription?: string;
  focusKeywords?: string[];
  targetAudience?: string;
  contentType?: 'article' | 'blog_post' | 'landing_page' | 'product_page';
  competitorUrls?: string[];
}

export interface ContentOptimizationResult {
  overallScore: number;
  recommendations: {
    type: 'title' | 'meta' | 'content' | 'keywords' | 'structure';
    priority: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    before?: string;
    after?: string;
  }[];
  seoAnalysis: {
    titleOptimization: {
      score: number;
      suggestions: string[];
    };
    contentStructure: {
      score: number;
      suggestions: string[];
    };
    keywordDensity: {
      score: number;
      suggestions: string[];
    };
    readability: {
      score: number;
      suggestions: string[];
    };
  };
  competitorInsights?: {
    gaps: string[];
    opportunities: string[];
    differentiators: string[];
  };
}

export interface KeywordStrategy {
  primaryKeywords: {
    keyword: string;
    intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
    difficulty: number;
    opportunity: number;
    suggestions: string[];
  }[];
  semanticClusters: {
    theme: string;
    keywords: string[];
    contentIdeas: string[];
  }[];
  contentGaps: {
    keyword: string;
    searchVolume: number;
    competitorCoverage: string[];
    contentSuggestion: string;
  }[];
}

export interface CompetitorAnalysis {
  strengths: string[];
  weaknesses: string[];
  contentStrategy: {
    topics: string[];
    format: string[];
    frequency: string;
  };
  seoStrategy: {
    targetKeywords: string[];
    contentLength: number;
    linkingStrategy: string[];
  };
  opportunities: {
    contentGaps: string[];
    keywordOpportunities: string[];
    improvementAreas: string[];
  };
}

/**
 * Analyze and optimize content using AI
 */
export async function analyzeContent(
  input: ContentAnalysisInput
): Promise<ContentOptimizationResult> {
  try {
    const prompt = `
Analyze this content for SEO optimization and provide detailed recommendations:

Title: ${input.title}
Content: ${input.content}
Meta Description: ${input.metaDescription || 'Not provided'}
Focus Keywords: ${input.focusKeywords?.join(', ') || 'Not provided'}
Target Audience: ${input.targetAudience || 'General audience'}
Content Type: ${input.contentType || 'article'}

Please provide a comprehensive analysis with:
1. Overall score (0-100)
2. Specific recommendations with priority, impact, and effort levels
3. SEO analysis for title, content structure, keyword density, and readability
4. Actionable suggestions for improvement

Format your response as valid JSON matching the ContentOptimizationResult interface.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO content analyst. Provide detailed, actionable recommendations for content optimization. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the JSON response
    const result = JSON.parse(response) as ContentOptimizationResult;
    
    // Validate required fields
    if (!result.overallScore || !result.recommendations || !result.seoAnalysis) {
      throw new Error('Invalid response format from OpenAI');
    }

    return result;
  } catch (error) {
    console.error('Error analyzing content with OpenAI:', error);
    throw new Error('Failed to analyze content with AI');
  }
}

/**
 * Generate keyword strategy using AI
 */
export async function generateKeywordStrategy(
  targetKeywords: string[],
  industry: string,
  competitorDomains?: string[]
): Promise<KeywordStrategy> {
  try {
    const prompt = `
Generate a comprehensive keyword strategy for these target keywords in the ${industry} industry:

Target Keywords: ${targetKeywords.join(', ')}
Industry: ${industry}
Competitor Domains: ${competitorDomains?.join(', ') || 'Not provided'}

Please provide:
1. Primary keywords with intent classification, difficulty, and opportunity scores
2. Semantic keyword clusters with content ideas
3. Content gaps and opportunities

Format your response as valid JSON matching the KeywordStrategy interface.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO strategist. Generate comprehensive keyword strategies based on industry analysis and competitive intelligence.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response) as KeywordStrategy;
  } catch (error) {
    console.error('Error generating keyword strategy:', error);
    throw new Error('Failed to generate keyword strategy');
  }
}

/**
 * Analyze competitor content strategy
 */
export async function analyzeCompetitor(
  competitorContent: {
    domain: string;
    title: string;
    content: string;
    metaDescription?: string;
  }[],
  targetKeywords: string[]
): Promise<CompetitorAnalysis> {
  try {
    const prompt = `
Analyze these competitor content samples for strategic insights:

Competitor Content:
${competitorContent.map(c => `
Domain: ${c.domain}
Title: ${c.title}
Content: ${c.content.substring(0, 1000)}...
Meta: ${c.metaDescription || 'Not provided'}
`).join('\n---\n')}

Target Keywords: ${targetKeywords.join(', ')}

Provide analysis of:
1. Competitor strengths and weaknesses
2. Content and SEO strategies
3. Opportunities for differentiation

Format as valid JSON matching the CompetitorAnalysis interface.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert competitive intelligence analyst. Analyze competitor strategies and identify opportunities.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response) as CompetitorAnalysis;
  } catch (error) {
    console.error('Error analyzing competitor:', error);
    throw new Error('Failed to analyze competitor');
  }
}

/**
 * Generate content improvements based on performance data
 */
export async function generateContentImprovements(
  content: {
    title: string;
    content: string;
    currentRankings: { keyword: string; position: number }[];
    performanceMetrics: {
      pageviews: number;
      bounceRate: number;
      avgSessionDuration: number;
      conversionRate: number;
    };
  },
  targetKeywords: string[]
): Promise<{
  improvements: {
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
    implementation: string;
  }[];
  predictedOutcomes: {
    rankingImprovements: { keyword: string; currentPosition: number; predictedPosition: number }[];
    trafficIncrease: number;
    conversionImprovement: number;
  };
}> {
  try {
    const prompt = `
Analyze this content's performance and generate specific improvement recommendations:

Content Title: ${content.title}
Current Rankings: ${content.currentRankings.map(r => `${r.keyword}: #${r.position}`).join(', ')}
Performance Metrics:
- Pageviews: ${content.performanceMetrics.pageviews}
- Bounce Rate: ${content.performanceMetrics.bounceRate}%
- Avg Session Duration: ${content.performanceMetrics.avgSessionDuration}s
- Conversion Rate: ${content.performanceMetrics.conversionRate}%

Target Keywords: ${targetKeywords.join(', ')}

Provide:
1. Specific improvements with priority and expected impact
2. Predicted outcomes for rankings, traffic, and conversions

Format as valid JSON.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content optimization analyst. Provide data-driven improvement recommendations with predicted outcomes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating content improvements:', error);
    throw new Error('Failed to generate content improvements');
  }
}

/**
 * Calculate token usage and cost estimation
 */
export function estimateTokensAndCost(text: string, model: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4'): {
  estimatedTokens: number;
  estimatedCost: number;
} {
  // Rough estimation: ~4 characters per token
  const estimatedTokens = Math.ceil(text.length / 4);
  
  // Pricing (as of 2024, subject to change)
  const pricing = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
  };
  
  const modelPricing = pricing[model];
  const estimatedCost = (estimatedTokens * modelPricing.input) + (estimatedTokens * 0.5 * modelPricing.output);
  
  return {
    estimatedTokens,
    estimatedCost,
  };
}

/**
 * Health check for OpenAI API
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5,
    });
    
    return !!completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('OpenAI health check failed:', error);
    return false;
  }
}