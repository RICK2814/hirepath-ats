/** Runtime validation schemas. This file intentionally uses CommonJS syntax so
 * Node 22.18+ can execute the TypeScript directly using native type stripping. */
const { z } = require("zod");
type SchemaType<T> = import("zod").ZodType<T>;

type CandidateStage = "Applied" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
type CandidateSource = "LinkedIn" | "Referral" | "Careers page" | "Agency" | "Job board";
type LoginInput = { email: string; password: string };
type CandidateInput = {
  name: string;
  email: string;
  phone?: string;
  job_id?: number | null;
  skills?: string;
  source?: CandidateSource;
  rating?: number;
  stage?: CandidateStage;
};
type JobCreateInput = { title: string; department?: string; location?: string; job_type?: string; stipend?: string; description?: string; requirements?: string };
type JobUpdateInput = { title?: string; department?: string; location?: string; job_type?: string; stipend?: string; description?: string; requirements?: string; status?: "open" | "closed" };
type NoteInput = { body: string };
type ScorecardInput = {
  scores: { Technical: number; Communication: number; "Problem solving": number; "Culture add": number };
  recommendation: "strong_yes" | "yes" | "no" | "strong_no";
  comment?: string;
};
type EmailSendInput = { subject: string; body: string };
type PublicApplicationInput = {
  job_id: number; name: string; email: string; phone?: string; cover?: string;
  resume_name?: string; resume_b64?: string; consent: true; website?: string;
};
type InterviewScheduleInput = { interview_at: string | null; duration_minutes?: number };
type SemanticSearchInput = { q: string; limit?: number };

const emailSchema = z.string().trim().email().max(254).transform((v: string) => v.toLowerCase());
// Browser select/data attributes submit IDs as strings; only positive, safe PostgreSQL integer IDs are accepted.
const positiveIdSchema = z.union([
  z.number().int().min(1).max(2147483647),
  z.string().trim().regex(/^[1-9]\d*$/).transform(Number)
]).pipe(z.number().int().min(1).max(2147483647));
const loginSchema: SchemaType<LoginInput> = z.object({
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
}).strict() satisfies SchemaType<CandidateInput>;
const candidateUpdateSchema: SchemaType<Partial<CandidateInput>> = candidateCreateSchema.partial().strict();
const jobCreateSchema: SchemaType<JobCreateInput> = z.object({
  title: z.string().trim().min(1).max(200),
  department: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  job_type: z.string().trim().max(80).optional(),
  stipend: z.string().trim().max(120).optional(),
  description: z.string().trim().max(3000).optional(),
  requirements: z.string().trim().max(3000).optional()
}).strict();
const jobUpdateSchema: SchemaType<JobUpdateInput> = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  department: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  job_type: z.string().trim().max(80).optional(),
  stipend: z.string().trim().max(120).optional(),
  description: z.string().trim().max(3000).optional(),
  requirements: z.string().trim().max(3000).optional(),
  status: z.enum(["open", "closed"]).optional()
}).strict();
const noteSchema: SchemaType<NoteInput> = z.object({ body: z.string().trim().min(1).max(2000) }).strict();
const scorecardSchema: SchemaType<ScorecardInput> = z.object({
  scores: z.object({
    Technical: z.number().int().min(1).max(5),
    Communication: z.number().int().min(1).max(5),
    "Problem solving": z.number().int().min(1).max(5),
    "Culture add": z.number().int().min(1).max(5)
  }).strict(),
  recommendation: z.enum(["strong_yes", "yes", "no", "strong_no"]),
  comment: z.string().max(1000).optional()
}).strict();
const emailSendSchema: SchemaType<EmailSendInput> = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000)
}).strict();
const publicApplicationSchema: SchemaType<PublicApplicationInput> = z.object({
  job_id: positiveIdSchema,
  name: z.string().trim().min(1).max(160),
  email: emailSchema,
  phone: z.string().trim().max(40).optional(),
  cover: z.string().max(5000).optional(),
  resume_name: z.string().max(255).optional(),
  resume_b64: z.string().max(7_000_000).optional(),
  consent: z.literal(true),
  website: z.string().max(500).optional()
}).strict();
const interviewScheduleSchema: SchemaType<InterviewScheduleInput> = z.object({
  interview_at: z.string().datetime({ offset: true }).nullable(),
  duration_minutes: z.number().int().min(15).max(240).optional()
}).strict();
const semanticSearchSchema: SchemaType<SemanticSearchInput> = z.object({
  q: z.string().trim().min(2).max(1000),
  limit: z.coerce.number().int().min(1).max(50).optional()
}).strict();

function parseOrThrow<T>(schema: SchemaType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const error = new Error("Invalid request") as Error & { status?: number; details?: unknown };
    error.status = 400;
    error.details = parsed.error.issues.map((issue: { path: PropertyKey[]; message: string }) => ({ path: issue.path.join("."), message: issue.message }));
    throw error;
  }
  return parsed.data;
}

module.exports = {
  loginSchema, candidateCreateSchema, candidateUpdateSchema, jobCreateSchema, jobUpdateSchema,
  noteSchema, scorecardSchema, emailSendSchema, publicApplicationSchema, interviewScheduleSchema,
  semanticSearchSchema, parseOrThrow
};
