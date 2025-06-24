/**
 * AI-Powered Content Optimization Edge Function
 * Provides intelligent content analysis and optimization recommendations
 */

import {
  handleCors,
  createResponse,
  createErrorResponse,
} from "../_shared/cors.ts";
import { getAuthUser, requireAuth } from "../_shared/auth.ts";
import {
  createDatabaseClient,
  getContentItemById,
  getUserTeamAccess,
} from "../_shared/database.ts";

interface AIOptimizationRequest {
  contentId: string;
  analysisType: 'full' | 'seo' | 'keywords' | 'competitor' | 'performance';
  options?: {
    includeCompetitorAnalysis?: boolean;
    generateRecommendations?: boolean;
    targetKeywords?: string[];
    competitorUrls?: string[];
  };
}

interface AIAnalysisResult {
  contentId: string;
  analysisType: string;
  overallScore: number;
  recommendations: {
    type: string;
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
  keywordStrategy?: {
    primaryKeywords: {
      keyword: string;
      intent: string;
      difficulty: number;
      opportunity: number;
    }[];
    semanticClusters: {
      theme: string;
      keywords: string[];
      contentIdeas: string[];
    }[];
  };
  generatedAt: string;
  processingTimeMs: number;
  tokensUsed: number;
  costUsd: number;
}

/**
 * Call OpenAI API for content analysis
 */
async function callOpenAI(prompt: string, model = 'gpt-4'): Promise<{
  response: string;
  tokensUsed: number;
  costUsd: number;
}> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
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
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Calculate usage and cost
  const tokensUsed = data.usage?.total_tokens || 0;
  const pricing = model === 'gpt-4' ? 0.03 / 1000 : 0.001 / 1000; // Simplified pricing
  const costUsd = tokensUsed * pricing;

  return {
    response: content,
    tokensUsed,
    costUsd,
  };
}

/**
 * Analyze content with AI
 */
async function analyzeContentWithAI(
  content: any,
  analysisType: string,
  options: any = {}
): Promise<Partial<AIAnalysisResult>> {
  const startTime = Date.now();

  let prompt = '';
  
  if (analysisType === 'full' || analysisType === 'seo') {
    prompt = `
Analyze this content for SEO optimization and provide detailed recommendations:

Title: ${content.title}
Content: ${content.content || 'No content provided'}
Meta Description: ${content.meta_description || 'Not provided'}
Focus Keywords: ${content.focus_keywords?.join(', ') || 'Not provided'}
Content Type: ${content.content_type || 'article'}
URL: ${content.url}

Please provide a comprehensive analysis with:
1. Overall score (0-100)
2. Specific recommendations with priority, impact, and effort levels
3. SEO analysis for title, content structure, keyword density, and readability
4. Actionable suggestions for improvement

Format your response as valid JSON with this structure:
{
  "overallScore": number,
  "recommendations": [
    {
      "type": "title|meta|content|keywords|structure",
      "priority": "high|medium|low",
      "impact": "high|medium|low", 
      "effort": "high|medium|low",
      "title": "string",
      "description": "string",
      "before": "string (optional)",
      "after": "string (optional)"
    }
  ],
  "seoAnalysis": {
    "titleOptimization": {
      "score": number,
      "suggestions": ["string"]
    },
    "contentStructure": {
      "score": number,
      "suggestions": ["string"]
    },
    "keywordDensity": {
      "score": number,
      "suggestions": ["string"]
    },
    "readability": {
      "score": number,
      "suggestions": ["string"]
    }
  }
}
`;
  }

  if (analysisType === 'keywords') {
    prompt = `
Generate a comprehensive keyword strategy for this content:

Title: ${content.title}
Content: ${content.content || 'No content provided'}
Current Focus Keywords: ${content.focus_keywords?.join(', ') || 'Not provided'}
Target Keywords: ${options.targetKeywords?.join(', ') || 'Not provided'}

Please provide:
1. Primary keywords with intent classification and opportunity scores
2. Semantic keyword clusters with content ideas
3. Keyword optimization recommendations

Format as valid JSON with this structure:
{
  "keywordStrategy": {
    "primaryKeywords": [
      {
        "keyword": "string",
        "intent": "informational|navigational|transactional|commercial",
        "difficulty": number,
        "opportunity": number
      }
    ],
    "semanticClusters": [
      {
        "theme": "string",
        "keywords": ["string"],
        "contentIdeas": ["string"]
      }
    ]
  },
  "recommendations": [
    {
      "type": "keywords",
      "priority": "high|medium|low",
      "impact": "high|medium|low",
      "effort": "high|medium|low", 
      "title": "string",
      "description": "string"
    }
  ]
}
`;
  }

  if (analysisType === 'competitor') {
    prompt = `
Analyze competitive opportunities for this content:

Title: ${content.title}
Content: ${content.content || 'No content provided'}
Focus Keywords: ${content.focus_keywords?.join(', ') || 'Not provided'}
Competitor URLs: ${options.competitorUrls?.join(', ') || 'Not provided'}

Provide competitive analysis with:
1. Content gaps and opportunities
2. Differentiators from competitors
3. Strategic recommendations

Format as valid JSON with this structure:
{
  "competitorInsights": {
    "gaps": ["string"],
    "opportunities": ["string"], 
    "differentiators": ["string"]
  },
  "recommendations": [
    {
      "type": "competitor",
      "priority": "high|medium|low",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "title": "string", 
      "description": "string"
    }
  ]
}
`;
  }

  const aiResult = await callOpenAI(prompt);
  const processingTime = Date.now() - startTime;

  try {
    const parsedResult = JSON.parse(aiResult.response);
    
    return {
      ...parsedResult,
      processingTimeMs: processingTime,
      tokensUsed: aiResult.tokensUsed,
      costUsd: aiResult.costUsd,
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Invalid response format from AI');
  }
}

/**
 * Save optimization session to database
 */
async function saveOptimizationSession(
  supabase: any,
  projectId: string,
  contentId: string,
  sessionType: string,
  inputData: any,
  outputData: any,
  processingTime: number,
  tokensUsed: number,
  costUsd: number,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('optimization_sessions')
    .insert({
      project_id: projectId,
      content_id: contentId,
      session_type: sessionType,
      ai_model: 'gpt-4',
      input_data: inputData,
      output_data: outputData,
      optimization_score: outputData.overallScore || null,
      processing_time_ms: processingTime,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
      status: 'completed',
      started_by: userId,
      completed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving optimization session:', error);
  }
}

Deno.serve(async req => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const user = await getAuthUser(req);
    const authError = requireAuth(user);
    if (authError) return authError;

    // Parse request
    const body: AIOptimizationRequest = await req.json();
    const { contentId, analysisType, options = {} } = body;

    if (!contentId) {
      return createErrorResponse('Content ID is required');
    }

    // Get database client
    const supabase = createDatabaseClient();

    // Get content item
    const content = await getContentItemById(supabase, contentId);
    if (!content) {
      return createErrorResponse('Content not found', 404);
    }

    // Check user access to content's project
    const { data: project } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', content.project_id)
      .single();

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    const hasAccess = await getUserTeamAccess(
      supabase,
      user!.id,
      project.team_id
    );
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Perform AI analysis
    const analysisResult = await analyzeContentWithAI(
      content,
      analysisType,
      options
    );

    // Save optimization session
    await saveOptimizationSession(
      supabase,
      content.project_id,
      contentId,
      `ai_${analysisType}`,
      { contentId, analysisType, options },
      analysisResult,
      analysisResult.processingTimeMs || 0,
      analysisResult.tokensUsed || 0,
      analysisResult.costUsd || 0,
      user!.id
    );

    // Save analysis result to database
    const { error: analysisError } = await supabase
      .from('analysis_results')
      .insert({
        project_id: content.project_id,
        content_id: contentId,
        analysis_type: `ai_${analysisType}`,
        results: analysisResult,
        confidence_score: 90, // High confidence for AI analysis
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

    if (analysisError) {
      console.error('Error saving analysis result:', analysisError);
    }

    const response: AIAnalysisResult = {
      contentId,
      analysisType,
      overallScore: analysisResult.overallScore || 0,
      recommendations: analysisResult.recommendations || [],
      seoAnalysis: analysisResult.seoAnalysis || {
        titleOptimization: { score: 0, suggestions: [] },
        contentStructure: { score: 0, suggestions: [] },
        keywordDensity: { score: 0, suggestions: [] },
        readability: { score: 0, suggestions: [] },
      },
      competitorInsights: analysisResult.competitorInsights,
      keywordStrategy: analysisResult.keywordStrategy,
      generatedAt: new Date().toISOString(),
      processingTimeMs: analysisResult.processingTimeMs || 0,
      tokensUsed: analysisResult.tokensUsed || 0,
      costUsd: analysisResult.costUsd || 0,
    };

    return createResponse(response);
  } catch (error) {
    console.error('AI content optimization error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});