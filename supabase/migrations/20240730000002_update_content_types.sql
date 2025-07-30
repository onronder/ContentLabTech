-- Update Content Types Migration
-- Fix content_type enum values to match UI expectations

-- ===================================================================
-- UPDATE CONTENT TYPE ENUM VALUES
-- ===================================================================

-- Drop the existing enum if it exists
DROP TYPE IF EXISTS content_type_enum CASCADE;

-- Create new enum with proper values
CREATE TYPE content_type_enum AS ENUM (
  'document',
  'image', 
  'video',
  'social',
  'blog_post',
  'article',
  'landing_page',
  'product_page',
  'category_page',
  'other'
);

-- Update the content_items table to use the new enum
ALTER TABLE content_items 
ALTER COLUMN content_type TYPE content_type_enum 
USING content_type::content_type_enum;

-- ===================================================================
-- UPDATE EXISTING CONTENT TYPE VALUES
-- ===================================================================

-- Update any existing content types to match new schema
UPDATE content_items SET content_type = 'document' WHERE content_type = 'pdf';
UPDATE content_items SET content_type = 'document' WHERE content_type = 'doc';
UPDATE content_items SET content_type = 'document' WHERE content_type = 'docx';
UPDATE content_items SET content_type = 'image' WHERE content_type = 'png';
UPDATE content_items SET content_type = 'image' WHERE content_type = 'jpg';
UPDATE content_items SET content_type = 'image' WHERE content_type = 'jpeg';
UPDATE content_items SET content_type = 'image' WHERE content_type = 'gif';
UPDATE content_items SET content_type = 'video' WHERE content_type = 'mp4';
UPDATE content_items SET content_type = 'video' WHERE content_type = 'mov';
UPDATE content_items SET content_type = 'video' WHERE content_type = 'avi';

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TYPE content_type_enum IS 'Valid content types for content_items table matching UI expectations';
COMMENT ON COLUMN content_items.content_type IS 'Type of content: document, image, video, social, blog_post, article, landing_page, product_page, category_page, other';