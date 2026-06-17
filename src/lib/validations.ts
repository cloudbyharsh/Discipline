import { z } from "zod";

export const onboardingSchema = z.object({
  habit_type: z.enum(["masturbation", "pornography", "social_media", "gaming", "custom"]),
  custom_name: z.string().max(60).optional().nullable(),
  goal_type: z.enum(["quit_completely", "reduce_frequency", "improve_self_control"]),
  first_target_days: z.coerce.number().int().min(1).max(3650),
  motivation_text: z.string().min(1, "This helps us remind you why you started.").max(2000),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const checkInSchema = z.object({
  was_successful: z.boolean(),
  urge_level: z.coerce.number().int().min(1).max(10),
  mood: z.enum(["great", "good", "neutral", "stressed", "anxious", "low"]),
  triggers: z.array(z.string()).default([]),
  journal_text: z.string().max(5000).optional().nullable(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const milestoneSchema = z.object({
  name: z.string().min(1).max(100),
  day_target: z.coerce.number().int().min(1).max(3650),
  reward_description: z.string().max(500).optional().nullable(),
  estimated_cost: z.coerce.number().min(0).max(1000000).optional().nullable(),
  reward_image_url: z.string().url().optional().nullable().or(z.literal("")),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;

export const journalEntrySchema = z.object({
  notes: z.string().min(1).max(10000),
  mood: z.enum(["great", "good", "neutral", "stressed", "anxious", "low"]).optional().nullable(),
  urge_level: z.coerce.number().int().min(1).max(10).optional().nullable(),
  triggers: z.array(z.string()).default([]),
});
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
