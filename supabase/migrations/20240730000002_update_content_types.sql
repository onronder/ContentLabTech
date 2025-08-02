-- Update Content Types Migration
-- Already handled by initial schema, just add comment

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON COLUMN content_items.content_type IS 'Type of content: article, blog_post, landing_page, product_page, category_page, other';