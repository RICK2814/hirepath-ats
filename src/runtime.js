/** Runtime validation schemas shared by the Express app. Keep this file plain CommonJS JavaScript
 * so Vercel can bundle and resolve it without depending on native TypeScript file loading. */
const { z } = require("zod");

const emailSchema = z.string().trim().email().max(254).transform((v) => v.toLowerCase());

// Browser select/data attributes submit IDs as strings; accept only positive, safe PostgreSQL integer IDs.
const positiveIdSchema = z.union([
  z.number().int().min(1).max(2147483647),
  z.string().trim().regex(/^[1-9]\d*$/).transform(Number)
]).pipe(z.number().int().min(1).max(2147483647));

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256)
}).strict();

const candidateCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: emailSchema,
  phone: z.string().trim().max(40).optional(),
  job_id: z.union([positiveIdSchema, z.null()]).optional(),
  skills: z.string().max(8000).optional(),
  source: z.enum(["LinkedIn", "Referral", "Careers page", "Agency", "Job board"]).optional(),
  rating: z.number().int().min(0).max(5).optional(),
  stage: z.enum(["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]).optional()
}).strict();

const candidateUpdateSchema = candidateCreateSchema.partial().strict();

const jobCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  department: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(3000).optional()
}).strict();

const jobUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  department: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(3000).optional(),
  status: z.enum(["open", "closed"]).optional()
}).strict();

const noteSchema = z.object({
  body: z.string().trim().min(1).max(2000)
}).strict();

const scorecardSchema = z.object({
  scores: z.object({
    Technical: z.number().int().min(1).max(5),
    Communication: z.number().int().min(1).max(5),
    "Problem solving": z.number().int().min(1).max(5),
    "Culture add": z.number().int().min(1).max(5)
  }).strict(),
  recommendation: z.enum(["strong_yes", "yes", "no", "strong_no"]),
  comment: z.string().max(1000).optional()
}).strict();

const emailSendSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000)
}).strict();

const publicApplicationSchema = z.object({
  job_id: positiveIdSchema,
  name: z.string().trim().min(1).max(160),
  email: emailSchema,
  phone: z.string().trim().max(40).optional(),
  cover: z.string().max(5000).optional(),
  resume_name: z.string().max(255).optional(),
  resume_b64: z.string().max(7000000).optional(),
  consent: z.literal(true),
  website: z.string().max(500).optional()
}).strict();

const interviewScheduleSchema = z.object({
  interview_at: z.string().datetime({ offset: true }).nullable(),
  duration_minutes: z.number().int().min(15).max(240).optional()
}).strict();

const semanticSearchSchema = z.object({
  q: z.string().trim().min(2).max(1000),
  limit: z.coerce.number().int().min(1).max(50).optional()
}).strict();

function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const error = new Error("Invalid request");
    error.status = 400;
    error.details = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
    throw error;
  }
  return parsed.data;
}

module.exports = {
  loginSchema,
  candidateCreateSchema,
  candidateUpdateSchema,
  jobCreateSchema,
  jobUpdateSchema,
  noteSchema,
  scorecardSchema,
  emailSendSchema,
  publicApplicationSchema,
  interviewScheduleSchema,
  semanticSearchSchema,
  parseOrThrow
};
