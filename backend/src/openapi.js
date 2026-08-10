// OpenAPI 3.0 specification for the SkillMesh API (Phase 1).
// Served at GET /api/openapi.json; interactive docs at GET /api/docs.

const jsonBody = (schemaRef) => ({
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } },
});

const jsonResponse = (description, schemaRef) => ({
  description,
  content: { 'application/json': { schema: schemaRef ? { $ref: `#/components/schemas/${schemaRef}` } : {} } },
});

const bearer = [{ bearerAuth: [] }];

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SkillMesh API',
    description: 'Community intelligence platform — auth, communities, projects, organizations, messaging and AI-powered search.',
    version: '0.7.0',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'auth', description: 'Authentication & sessions' },
    { name: 'communities', description: 'Community management' },
    { name: 'projects', description: 'Collaboration projects' },
    { name: 'organizations', description: 'Org workspaces' },
    { name: 'messages', description: 'Messaging & notifications' },
    { name: 'search', description: 'AI-powered talent search' },
    { name: 'system', description: 'Health & API metadata' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['system'],
        summary: 'Health check',
        responses: {
          200: jsonResponse('Service status, database mode and feature flags', 'HealthResponse'),
        },
      },
    },
    '/api/openapi.json': {
      get: {
        tags: ['system'],
        summary: 'OpenAPI 3.0 specification',
        responses: { 200: { description: 'The OpenAPI document.' } },
      },
    },
    '/api/docs': {
      get: {
        tags: ['system'],
        summary: 'Interactive API documentation (Swagger UI)',
        responses: { 200: { description: 'Swagger UI HTML page.' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'Create an account',
        requestBody: jsonBody('RegisterRequest'),
        responses: {
          201: jsonResponse('Created — access + refresh tokens set as HttpOnly cookies', 'AuthSuccess'),
          400: jsonResponse('Validation failed', 'ErrorResponse'),
          409: jsonResponse('Email already registered', 'ErrorResponse'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Log in',
        requestBody: jsonBody('LoginRequest'),
        responses: {
          200: jsonResponse('OK — tokens set as HttpOnly cookies', 'AuthSuccess'),
          400: jsonResponse('Validation failed', 'ErrorResponse'),
          401: jsonResponse('Invalid credentials', 'ErrorResponse'),
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['auth'],
        summary: 'Rotate a refresh token for a fresh access token',
        requestBody: jsonBody('RefreshRequest'),
        responses: {
          200: jsonResponse('OK — new tokens set as HttpOnly cookies', 'AuthSuccess'),
          401: jsonResponse('Refresh token invalid, expired or already used', 'ErrorResponse'),
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Revoke the refresh token and clear session cookies',
        requestBody: jsonBody('LogoutRequest'),
        responses: { 200: jsonResponse('OK', 'LogoutSuccess') },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['auth'],
        summary: 'Request a password reset token',
        requestBody: jsonBody('ForgotPasswordRequest'),
        responses: { 200: jsonResponse('OK — dev mode includes resetToken', 'ForgotPasswordSuccess') },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['auth'],
        summary: 'Reset the password using a reset token',
        requestBody: jsonBody('ResetPasswordRequest'),
        responses: {
          200: jsonResponse('OK — password updated, all sessions revoked', 'ResetPasswordSuccess'),
          400: jsonResponse('Invalid/expired token or weak password', 'ErrorResponse'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Current user profile',
        security: bearer,
        responses: {
          200: jsonResponse('OK', 'User'),
          401: jsonResponse('Missing or invalid token', 'ErrorResponse'),
        },
      },
    },
    '/api/communities': {
      get: {
        tags: ['communities'],
        summary: 'List communities (supports ?q= search)',
        responses: { 200: jsonResponse('OK', 'CommunityList') },
      },
      post: {
        tags: ['communities'],
        summary: 'Create a community',
        security: bearer,
        requestBody: jsonBody('CommunityCreate'),
        responses: {
          201: jsonResponse('Created', 'Community'),
          400: jsonResponse('Validation failed', 'ErrorResponse'),
        },
      },
    },
    '/api/projects': {
      get: {
        tags: ['projects'],
        summary: 'List projects (?communityId=, ?status=, ?mine=1)',
        responses: { 200: jsonResponse('OK', 'ProjectList') },
      },
      post: {
        tags: ['projects'],
        summary: 'Create a project',
        security: bearer,
        requestBody: jsonBody('ProjectCreate'),
        responses: {
          201: jsonResponse('Created', 'Project'),
          400: jsonResponse('Validation failed', 'ErrorResponse'),
        },
      },
    },
    '/api/organizations': {
      post: {
        tags: ['organizations'],
        summary: 'Create an organization workspace',
        security: bearer,
        requestBody: jsonBody('OrganizationCreate'),
        responses: {
          201: jsonResponse('Created', 'Organization'),
          400: jsonResponse('Validation failed or unknown type', 'ErrorResponse'),
        },
      },
    },
    '/api/messages': {
      post: {
        tags: ['messages'],
        summary: 'Send a DM or project discussion message',
        security: bearer,
        requestBody: jsonBody('MessageCreate'),
        responses: {
          201: jsonResponse('Created', 'Message'),
          400: jsonResponse('Validation failed', 'ErrorResponse'),
          403: jsonResponse('Not a project member / announcement requires owner or lead', 'ErrorResponse'),
        },
      },
    },
    '/api/search': {
      post: {
        tags: ['search'],
        summary: 'AI-powered talent search (plain-language queries)',
        requestBody: jsonBody('SearchRequest'),
        responses: {
          200: jsonResponse('OK', 'SearchResult'),
          400: jsonResponse('Blank query', 'ErrorResponse'),
        },
      },
    },
    '/api/search/semantic': {
      post: {
        tags: ['search'],
        summary: 'Semantic (embedding) search — ranks people, opportunities, skills, projects by meaning',
        description:
          'Uses cosine similarity over 384-dim embeddings (pgvector-backed storage when available). ' +
          'Responses include understanding.source: "llm" | "heuristic".',
        requestBody: jsonBody('SearchRequest'),
        responses: {
          200: jsonResponse('OK', 'SemanticSearchResult'),
          400: jsonResponse('Blank query', 'ErrorResponse'),
        },
      },
    },
    '/api/search/semantic/pg': {
      get: {
        tags: ['search'],
        summary: 'Genuine pgvector SQL distance query (ORDER BY vector <=> $1)',
        parameters: [
          { name: 'text', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'entityType', in: 'query', schema: { type: 'string', enum: ['user', 'skill', 'opportunity', 'project'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: jsonResponse('OK', 'PgVectorResult'),
          400: jsonResponse('Missing text', 'ErrorResponse'),
          501: jsonResponse('pgvector unavailable (JSON mode or no vector extension)', 'ErrorResponse'),
        },
      },
    },
    '/api/recommendations/feedback': {
      post: {
        tags: ['recommendations'],
        summary: 'Record up/down feedback on a recommendation (upsert per user + target + context)',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody('FeedbackCreate'),
        responses: {
          200: jsonResponse('OK', 'FeedbackResult'),
          400: jsonResponse('Validation failed', 'ErrorResponse'),
          401: jsonResponse('Unauthorized', 'ErrorResponse'),
        },
      },
      get: {
        tags: ['recommendations'],
        summary: "The viewer's own feedback (optionally filtered by targetType)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'targetType', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: jsonResponse('OK', 'FeedbackList'),
          401: jsonResponse('Unauthorized', 'ErrorResponse'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'skillmesh_at' },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { path: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' },
              location: { type: 'string', nullable: true }, availability: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
      AuthSuccess: {
        type: 'object',
        required: ['token', 'refreshToken', 'user'],
        properties: {
          token: { type: 'string', description: 'Short-lived access JWT' },
          refreshToken: { type: 'string', description: 'Opaque refresh token (rotated on use)' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', maxLength: 120 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          location: { type: 'string', nullable: true },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string' }, password: { type: 'string' } },
      },
      RefreshRequest: {
        type: 'object',
        properties: { refreshToken: { type: 'string', description: 'Optional — falls back to the skillmesh_rt cookie' } },
      },
      LogoutRequest: {
        type: 'object',
        properties: { refreshToken: { type: 'string' } },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      ForgotPasswordSuccess: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          resetToken: { type: 'string', description: 'Only returned in non-production environments' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: { token: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } },
      },
      ResetPasswordSuccess: {
        type: 'object',
        properties: { ok: { type: 'boolean' }, message: { type: 'string' } },
      },
      LogoutSuccess: { type: 'object', properties: { ok: { type: 'boolean' } } },
      CommunityCreate: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', maxLength: 140 }, description: { type: 'string' } },
      },
      Community: {
        type: 'object',
        properties: {
          community: {
            type: 'object',
            properties: {
              id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' },
              ownerId: { type: 'string', nullable: true }, memberCount: { type: 'integer' },
            },
          },
        },
      },
      CommunityList: {
        type: 'object',
        properties: {
          communities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' },
                ownerId: { type: 'string', nullable: true }, memberCount: { type: 'integer' },
              },
            },
          },
        },
      },
      ProjectCreate: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string' },
          goal: { type: 'string' },
          communityId: { type: 'string', nullable: true },
          timeline: { type: 'string', nullable: true },
        },
      },
      Project: {
        type: 'object',
        properties: {
          project: {
            type: 'object',
            properties: {
              id: { type: 'string' }, title: { type: 'string' }, ownerId: { type: 'string' },
              status: { type: 'string' }, memberCount: { type: 'integer' },
            },
          },
        },
      },
      ProjectList: {
        type: 'object',
        properties: {
          projects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' }, title: { type: 'string' }, ownerId: { type: 'string' },
                status: { type: 'string' }, memberCount: { type: 'integer' },
              },
            },
          },
        },
      },
      OrganizationCreate: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', maxLength: 200 },
          type: { type: 'string', enum: ['ngo', 'school', 'college', 'club', 'small_business'] },
          description: { type: 'string' },
          communityId: { type: 'string', nullable: true },
        },
      },
      Organization: {
        type: 'object',
        properties: {
          organization: {
            type: 'object',
            properties: {
              id: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' },
              memberCount: { type: 'integer' },
            },
          },
        },
      },
      MessageCreate: {
        type: 'object',
        required: ['body'],
        properties: {
          toUserId: { type: 'string', nullable: true },
          projectId: { type: 'string', nullable: true },
          body: { type: 'string', maxLength: 5000 },
          announcement: { type: 'boolean', description: 'Requires owner/lead project role' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          message: {
            type: 'object',
            properties: {
              id: { type: 'string' }, fromUserId: { type: 'string' }, toUserId: { type: 'string', nullable: true },
              projectId: { type: 'string', nullable: true }, body: { type: 'string' },
              announcement: { type: 'boolean' },
            },
          },
        },
      },
      SearchRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', maxLength: 500, description: 'Plain-language need description' },
          communityId: { type: 'string', nullable: true },
        },
      },
      SearchResult: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['people', 'team_builder'] },
          results: { type: 'array' },
          resultCount: { type: 'integer' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string' }, service: { type: 'string' }, phase: { type: 'integer' },
          database: { type: 'string' }, dbPing: { type: 'string' }, features: { type: 'array', items: { type: 'string' } },
        },
      },
      SemanticSearchResult: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          engine: { type: 'string', enum: ['memory', 'pgvector'] },
          pgVectorAvailable: { type: 'boolean' },
          embeddingDim: { type: 'integer' },
          people: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                similarity: { type: 'integer', description: 'Cosine similarity 0-100' },
                trustScore: { type: 'integer' },
                relevant: { type: 'boolean' },
                explain: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          opportunities: { type: 'array' },
          skills: { type: 'array' },
          projects: { type: 'array' },
        },
      },
      PgVectorResult: {
        type: 'object',
        properties: {
          engine: { type: 'string', enum: ['pgvector'] },
          text: { type: 'string' },
          entityType: { type: 'string' },
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: { type: 'string' },
                similarity: { type: 'integer', description: 'Cosine similarity 0-100' },
              },
            },
          },
        },
      },
      FeedbackCreate: {
        type: 'object',
        required: ['targetType', 'targetId', 'rating'],
        properties: {
          targetType: { type: 'string', enum: ['user', 'project', 'opportunity', 'skill'] },
          targetId: { type: 'string' },
          rating: { type: 'string', enum: ['up', 'down'] },
          context: { type: 'string', description: 'Free-form context to scope the upsert (e.g. "search")' },
        },
      },
      FeedbackResult: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          rating: { type: 'string', enum: ['up', 'down'] },
          targetType: { type: 'string' },
          targetId: { type: 'string' },
        },
      },
      FeedbackList: {
        type: 'object',
        properties: {
          feedback: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                targetType: { type: 'string' },
                targetId: { type: 'string' },
                rating: { type: 'string', enum: ['up', 'down'] },
                context: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

const openapiDocsHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SkillMesh API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis] });
  };
</script>
</body>
</html>`;

module.exports = { openapiSpec, openapiDocsHtml };
