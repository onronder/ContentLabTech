-- Create Sample Content Function for Users
-- Allows authenticated users to create sample content for testing

-- ===================================================================
-- CREATE PUBLIC FUNCTION TO GENERATE SAMPLE CONTENT
-- ===================================================================

CREATE OR REPLACE FUNCTION public.create_sample_content()
RETURNS json AS $$
DECLARE
  user_id UUID;
  sample_project_id UUID;
  content_ids UUID[];
  result JSON;
BEGIN
  -- Get current authenticated user
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get user's first project
  SELECT p.id INTO sample_project_id 
  FROM projects p
  JOIN teams t ON p.team_id = t.id
  JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_id 
  LIMIT 1;
  
  IF sample_project_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No accessible project found. Please create a project first.'
    );
  END IF;

  -- Check if user already has sample content
  IF EXISTS (
    SELECT 1 FROM content_items 
    WHERE project_id = sample_project_id 
    AND title LIKE '%Demo%' OR title LIKE '%Sample%'
    LIMIT 1
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Sample content already exists for this user'
    );
  END IF;

  -- Insert sample content items
  INSERT INTO content_items (
        project_id,
    title,
    description,
    content_type,
    status,
    file_size,
    mime_type,
    metadata,
    focus_keywords,
    word_count,
    readability_score,
    seo_score
  ) VALUES 
  (
        sample_project_id,
    'Competitive Analysis Report Q4 2024',
    'Comprehensive analysis of competitor strategies and market positioning for the fourth quarter.',
    'document',
    'published',
    2456789,
    'application/pdf',
    '{"pages": 24, "wordCount": 5420, "language": "en"}',
    ARRAY['competitive analysis', 'market research', 'Q4 2024', 'strategy'],
    5420,
    78,
    85
  ),
  (
        sample_project_id,
    'Product Demo Video',
    'Professional product demonstration showcasing key features and benefits.',
    'video',
    'published',
    45678901,
    'video/mp4',
    '{"duration": 180, "resolution": "1920x1080", "frameRate": 30}',
    ARRAY['product demo', 'video marketing', 'features'],
    0,
    85,
    72
  ),
  (
        sample_project_id,
    'Brand Guidelines Infographic',
    'Visual representation of brand colors, typography, and design principles.',
    'image',
    'published',
    1234567,
    'image/png',
    '{"dimensions": {"width": 1200, "height": 800}, "colorProfile": "sRGB"}',
    ARRAY['brand guidelines', 'design', 'infographic'],
    0,
    90,
    68
  ),
  (
        sample_project_id,
    'Social Media Campaign Assets',
    'Collection of social media posts and graphics for the upcoming campaign.',
    'social',
    'draft',
    987654,
    'image/jpeg',
    '{"dimensions": {"width": 1080, "height": 1080}, "platform": "instagram"}',
    ARRAY['social media', 'campaign', 'instagram', 'graphics'],
    250,
    88,
    71
  ),
  (
        sample_project_id,
    'SEO Strategy Blog Post',
    'Detailed blog post outlining our SEO strategy and implementation roadmap.',
    'blog_post',
    'under_review',
    156789,
    'text/markdown',
    '{"wordCount": 2340, "readingTime": 12, "keywords": ["SEO", "strategy", "content"]}',
    ARRAY['SEO', 'content strategy', 'blog post', 'digital marketing'],
    2340,
    82,
    89
  )
  RETURNING id INTO content_ids;

  -- Insert corresponding analytics data
  INSERT INTO content_analytics (content_id, pageviews, unique_visitors, bounce_rate, avg_session_duration, conversions, conversion_rate)
  SELECT 
    unnest(content_ids),
    FLOOR(RANDOM() * 1000 + 50)::INTEGER,
    FLOOR(RANDOM() * 800 + 40)::INTEGER,
    ROUND((RANDOM() * 30 + 20)::NUMERIC, 2),
    FLOOR(RANDOM() * 300 + 60)::INTEGER,
    FLOOR(RANDOM() * 50 + 1)::INTEGER,
    ROUND((RANDOM() * 5 + 1)::NUMERIC, 2);

  -- Insert sample tags
  WITH content_with_titles AS (
    SELECT id, title FROM content_items 
    WHERE project_id = sample_project_id 
    AND id = ANY(content_ids)
  )
  INSERT INTO content_tags (content_id, tag)
  SELECT id, unnest(ARRAY['competitive-analysis', 'Q4-2024', 'strategy', 'report'])
  FROM content_with_titles WHERE title = 'Competitive Analysis Report Q4 2024'
  UNION ALL
  SELECT id, unnest(ARRAY['product-demo', 'video-content', 'marketing', 'features'])
  FROM content_with_titles WHERE title = 'Product Demo Video'
  UNION ALL
  SELECT id, unnest(ARRAY['brand-guidelines', 'design', 'infographic', 'visual'])
  FROM content_with_titles WHERE title = 'Brand Guidelines Infographic'
  UNION ALL
  SELECT id, unnest(ARRAY['social-media', 'campaign', 'instagram', 'graphics'])
  FROM content_with_titles WHERE title = 'Social Media Campaign Assets'
  UNION ALL
  SELECT id, unnest(ARRAY['SEO', 'blog-post', 'strategy', 'content-marketing'])
  FROM content_with_titles WHERE title = 'SEO Strategy Blog Post';

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Sample content created successfully',
    'content_count', array_length(content_ids, 1),
    'project_id', sample_project_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- GRANT PERMISSIONS AND CREATE API ENDPOINT
-- ===================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_sample_content() TO authenticated;

-- Create RPC endpoint comment
COMMENT ON FUNCTION public.create_sample_content() IS 
'Creates sample content data for the authenticated user for testing and demonstration purposes. Can only be called once per user.';

-- ===================================================================
-- CREATE ADMIN FUNCTION TO RESET SAMPLE DATA
-- ===================================================================

CREATE OR REPLACE FUNCTION public.reset_sample_content()
RETURNS json AS $$
DECLARE
  user_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Get current authenticated user
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Delete existing sample content
  WITH deleted_content AS (
    DELETE FROM content_items 
    WHERE project_id = sample_project_id 
    AND (
      title LIKE '%Demo%' OR 
      title LIKE '%Sample%' OR
      title IN (
        'Competitive Analysis Report Q4 2024',
        'Product Demo Video',
        'Brand Guidelines Infographic', 
        'Social Media Campaign Assets',
        'SEO Strategy Blog Post'
      )
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_content;

  RETURN json_build_object(
    'success', true,
    'message', 'Sample content deleted successfully',
    'deleted_count', deleted_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reset_sample_content() TO authenticated;

COMMENT ON FUNCTION public.reset_sample_content() IS 
'Deletes all sample content for the authenticated user';