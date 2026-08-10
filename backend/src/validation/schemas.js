// Zod request schemas (Phase 1). ID fields are kept as lenient strings so the
// existing flexible SPA clients keep working; required scalar fields are
// strictly validated and normalized via trim.

const { z } = require('zod');

const email = z.email('Invalid email address');

const idRef = z.string().optional().nullable();

const authRegister = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  email,
  password: z.string().min(6, 'password must be at least 6 characters').max(200),
  location: z.string().trim().max(200).optional().nullable(),
});

const authLogin = z.object({
  email: z.string().trim().min(1, 'email is required'),
  password: z.string().min(1, 'password is required'),
});

const refreshToken = z.object({
  refreshToken: z.string().optional(),
});

const forgotPassword = z.object({
  email: z.string().trim().min(1, 'email is required'),
});

const resetPassword = z.object({
  token: z.string().min(1, 'token is required'),
  newPassword: z.string().min(8, 'newPassword must be at least 8 characters').max(200),
});

const communityCreate = z.object({
  name: z.string().trim().min(1, 'name is required').max(140),
  description: z.string().trim().max(2000).optional(),
});

const projectCreate = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  goal: z.string().trim().max(2000).optional(),
  communityId: idRef,
  timeline: z.string().trim().max(500).optional().nullable(),
});

const organizationCreate = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  type: z.enum(['ngo', 'school', 'college', 'club', 'small_business']),
  description: z.string().trim().max(2000).optional(),
  communityId: idRef,
});

const messageCreate = z.object({
  toUserId: idRef,
  projectId: idRef,
  body: z.string().trim().min(1, 'body is required').max(5000),
  announcement: z.boolean().optional(),
});

const searchQuery = z.object({
  query: z.string().trim().min(1, 'query is required').max(500),
  communityId: idRef,
  mode: z.string().optional(),
});

const feedbackCreate = z.object({
  targetType: z.enum(['user', 'project', 'opportunity', 'skill']),
  targetId: z.string().trim().min(1, 'targetId is required').max(100),
  rating: z.enum(['up', 'down']),
  context: z.string().trim().max(200).optional(),
});

module.exports = {
  authRegister, authLogin, refreshToken, forgotPassword, resetPassword,
  communityCreate, projectCreate, organizationCreate, messageCreate, searchQuery,
  feedbackCreate,
};
