# Competitors API Testing Guide

## Overview

This document provides testing steps for the enhanced Competitors API with comprehensive logging.

## API Endpoint

**POST** `/api/competitive/competitors`

## Enhanced Features

✅ **Comprehensive Logging** - Detailed request/response logging
✅ **Automatic Team Resolution** - Resolves team ID from user membership if not provided
✅ **Field Validation** - Validates all required fields from AddCompetitorModal
✅ **Error Handling** - Specific error codes and detailed error messages
✅ **Authentication** - Enhanced session validation and team access control

## Expected Request Body

```json
{
  "name": "Apple Inc.",
  "domain": "apple.com",
  "website_url": "https://apple.com",
  "industry": "Technology",
  "description": "Consumer electronics and software company"
}
```

## Console Log Output

When testing, you should see detailed logs like:

```
🔍 [COMPETITORS API] POST request received
🔍 [COMPETITORS API] Headers: { content-type: 'application/json', cookie: 'Present', ... }
🔍 [COMPETITORS API] Request body received: { hasName: true, hasDomain: true, ... }
🔍 [COMPETITORS API] Validating team access for: { userId: '...', teamId: '...' }
✅ [COMPETITORS API] Team access validated: { userId: '...', teamId: '...', userRole: 'member' }
✅ [COMPETITORS API] Team found: { teamId: '...', teamName: '...' }
✅ [COMPETITORS API] Field validation passed
🔍 [COMPETITORS API] Inserting competitor: { name: 'Apple Inc....', domain: 'apple.com', ... }
✅ [COMPETITORS API] Competitor created successfully: { id: '...', name: 'Apple Inc.', teamId: '...' }
```

## Error Scenarios

The API now handles these error cases with detailed logging:

1. **Missing Fields** - Returns validation error with field-specific messages
2. **No Team Membership** - Automatically resolves team or returns team membership error
3. **Access Denied** - Returns team access denied with role information
4. **Database Errors** - Returns specific database error codes (e.g., TABLE_MISSING)

## Testing with AddCompetitorModal

The AddCompetitorModal should now work seamlessly with the enhanced API:

1. Open the competitive intelligence page
2. Click "Add Competitor"
3. Fill in the form fields
4. Submit the form
5. Check browser console and server logs for detailed debugging information

## Success Response

```json
{
  "success": true,
  "data": {
    "id": "competitor-id",
    "name": "Apple Inc.",
    "domain": "apple.com",
    "website_url": "https://apple.com",
    "industry": "Technology",
    "description": "Consumer electronics...",
    "team_id": "team-id",
    "created_by": "user-id",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Competitor added successfully"
}
```

## Next Steps

1. Test the API endpoint with the AddCompetitorModal
2. Review server logs for detailed debugging information
3. Verify all fields are properly saved to the database
4. Test error scenarios (missing fields, invalid data, etc.)
