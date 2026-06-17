import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "At least 8 characters."),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Enter a valid email."),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
