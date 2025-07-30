-- Content Library Critical Security Fixes
-- Implements RLS policies and creates test data

-- ===================================================================
-- CRITICAL SECURITY: ENABLE ROW LEVEL SECURITY
-- ===================================================================

-- 1. Enable RLS on content_items table
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Users can only view content in projects they have access to
CREATE POLICY "Users can view content in accessible projects" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = content_items.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can insert content only in their own projects
CREATE POLICY "Users can insert content in own projects" ON content_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = content_items.project_id
      AND p.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own content
CREATE POLICY "Users can update own content" ON content_items
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own content
CREATE POLICY "Users can delete own content" ON content_items
  FOR DELETE USING (user_id = auth.uid());

-- ===================================================================
-- CONTENT ANALYTICS RLS
-- ===================================================================

-- Enable RLS on content_analytics table
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for accessible content" ON content_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      JOIN projects p ON ci.project_id = p.id
      WHERE ci.id = content_analytics.content_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage analytics for own content" ON content_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = content_analytics.content_id
      AND ci.user_id = auth.uid()
    )
  );

-- ===================================================================
-- CONTENT TAGS RLS
-- ===================================================================

-- Enable RLS on content_tags table
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for accessible content" ON content_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      JOIN projects p ON ci.project_id = p.id
      WHERE ci.id = content_tags.content_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tags for own content" ON content_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = content_tags.content_id
      AND ci.user_id = auth.uid()
    )
  );

-- ===================================================================
-- STORAGE BUCKET POLICIES
-- ===================================================================

-- Users can upload files to own content
INSERT INTO storage.policies (id, name, bucket_id, table_name, operation, definition)
VALUES (
  'content-files-upload-own',
  'Users can upload files to own content',
  'content-files',
  'objects',
  'INSERT',
  '(bucket_id = ''content-files'' AND auth.uid()::text = (storage.foldername(name))[1] AND EXISTS (SELECT 1 FROM content_items WHERE id::text = (storage.foldername(name))[2] AND user_id = auth.uid()))'
) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;

-- Users can view files in accessible content
INSERT INTO storage.policies (id, name, bucket_id, table_name, operation, definition)
VALUES (
  'content-files-view-accessible',
  'Users can view files in accessible content',
  'content-files',
  'objects',
  'SELECT',
  '(bucket_id = ''content-files'' AND (auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM content_items ci JOIN projects p ON ci.project_id = p.id WHERE ci.id::text = (storage.foldername(name))[2] AND p.user_id = auth.uid())))'
) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;

-- Users can delete own files
INSERT INTO storage.policies (id, name, bucket_id, table_name, operation, definition)
VALUES (
  'content-files-delete-own',
  'Users can delete own files',
  'content-files',
  'objects',
  'DELETE',
  '(bucket_id = ''content-files'' AND auth.uid()::text = (storage.foldername(name))[1] AND EXISTS (SELECT 1 FROM content_items WHERE id::text = (storage.foldername(name))[2] AND user_id = auth.uid()))'
) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition;

-- ===================================================================
-- FUNCTION TO CREATE SAMPLE CONTENT DATA
-- ===================================================================

CREATE OR REPLACE FUNCTION create_sample_content_for_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  sample_project_id UUID;
  content_id_1 UUID;
  content_id_2 UUID;
  content_id_3 UUID;
  content_id_4 UUID;
  content_id_5 UUID;
BEGIN
  -- Get the user's first project
  SELECT id INTO sample_project_id 
  FROM projects 
  WHERE user_id = target_user_id 
  LIMIT 1;
  
  IF sample_project_id IS NULL THEN
    RAISE EXCEPTION 'No project found for user %', target_user_id;
  END IF;

  -- Insert sample content items
  INSERT INTO content_items (
    id,
    user_id,
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
    readability_score
  ) VALUES 
  (
    gen_random_uuid(),
    target_user_id,
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
    78
  ),
  (
    gen_random_uuid(),
    target_user_id,
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
    85
  ),
  (
    gen_random_uuid(),
    target_user_id,
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
    90
  ),
  (
    gen_random_uuid(),
    target_user_id,
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
    88
  ),
  (
    gen_random_uuid(),
    target_user_id,
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
    82
  )
  RETURNING id INTO content_id_1, content_id_2, content_id_3, content_id_4, content_id_5;

  -- Get the content IDs for analytics
  SELECT array_agg(id) INTO ARRAY[content_id_1, content_id_2, content_id_3, content_id_4, content_id_5]
  FROM content_items 
  WHERE user_id = target_user_id 
  AND project_id = sample_project_id
  ORDER BY created_at DESC
  LIMIT 5;

  -- Insert corresponding analytics data
  INSERT INTO content_analytics (content_id, pageviews, unique_visitors, bounce_rate, avg_session_duration, conversions, conversion_rate)
  SELECT 
    unnest(ARRAY[content_id_1, content_id_2, content_id_3, content_id_4, content_id_5]),
    FLOOR(RANDOM() * 1000 + 50)::INTEGER,
    FLOOR(RANDOM() * 800 + 40)::INTEGER,
    ROUND((RANDOM() * 30 + 20)::NUMERIC, 2),
    FLOOR(RANDOM() * 300 + 60)::INTEGER,
    FLOOR(RANDOM() * 50 + 1)::INTEGER,
    ROUND((RANDOM() * 5 + 1)::NUMERIC, 2);

  -- Insert sample tags
  WITH content_with_titles AS (
    SELECT id, title FROM content_items 
    WHERE user_id = target_user_id 
    AND project_id = sample_project_id
    AND title IN (
      'Competitive Analysis Report Q4 2024',
      'Product Demo Video', 
      'Brand Guidelines Infographic',
      'Social Media Campaign Assets',
      'SEO Strategy Blog Post'
    )
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

  RAISE NOTICE 'Successfully created sample content for user %', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- GRANT NECESSARY PERMISSIONS
-- ===================================================================

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION create_sample_content_for_user(UUID) TO authenticated;

-- Create index for better performance on content queries
CREATE INDEX IF NOT EXISTS idx_content_items_user_project ON content_items(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_analytics_content_id ON content_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON POLICY "Users can view content in accessible projects" ON content_items IS 
'Ensures users can only see content in projects they own or have access to';

COMMENT ON POLICY "Users can insert content in own projects" ON content_items IS 
'Restricts content creation to user''s own projects only';

COMMENT ON FUNCTION create_sample_content_for_user(UUID) IS 
'Creates sample content data for testing and demonstration purposes';