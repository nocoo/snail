import { z } from "zod";

export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
export const PART_BYTES = 8 * 1024 * 1024;
export const nameSchema = z.string().trim().min(1).max(100);
export const idSchema = z.string().uuid();
export const categorySchema = z
  .object({ name: nameSchema, parentId: idSchema.nullable().optional() })
  .strict();
export const tagSchema = z.object({ name: nameSchema }).strict();
export const titleSchema = z.string().trim().min(1).max(300);
export const shaSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const postIdSchema = z.string().regex(/^\d{15,22}$/);
export const sourceUrlSchema = z
  .string()
  .url()
  .regex(/^https:\/\/x\.com\/[a-zA-Z0-9_]{1,50}\/status\/\d{15,22}$/);
export const importSchema = z
  .object({
    sourceId: postIdSchema,
    sourceUrl: sourceUrlSchema,
    title: titleSchema,
    description: z.string().max(5000).optional(),
    mediaId: postIdSchema,
    mediaUrl: z.string().url().max(2048),
    posterUrl: z.string().url().max(2048).optional(),
    duration: z.number().finite().positive().max(86400).optional(),
    width: z.number().int().positive().max(16384).optional(),
    height: z.number().int().positive().max(16384).optional(),
    approved: z.literal(true),
  })
  .strict()
  .refine((value) => value.sourceUrl.endsWith(`/status/${value.sourceId}`));
export type ApprovedImport = z.infer<typeof importSchema>;
export const uploadSchema = z
  .object({
    title: titleSchema,
    size: z.number().int().min(24).max(MAX_VIDEO_BYTES),
    mime: z.enum(["video/mp4", "video/webm", "video/quicktime"]),
    sha256: shaSchema,
    approved: z.literal(true),
    duration: z.number().finite().nonnegative().max(86400).optional(),
    width: z.number().int().positive().max(16384).optional(),
    height: z.number().int().positive().max(16384).optional(),
    source: z
      .object({ id: postIdSchema, url: sourceUrlSchema, mediaId: postIdSchema })
      .strict()
      .optional(),
  })
  .strict();
export type UploadInput = z.infer<typeof uploadSchema>;
export const assetPatchSchema = z
  .object({
    title: titleSchema.optional(),
    description: z.string().max(5000).optional(),
    favorite: z.boolean().optional(),
    categoryId: idSchema.nullable().optional(),
    tagIds: z.array(idSchema).max(30).optional(),
  })
  .strict();
export const bulkSchema = z
  .object({
    ids: z.array(idSchema).min(1).max(100),
    action: z.enum(["favorite", "unfavorite", "category", "tags", "delete"]),
    categoryId: idSchema.nullable().optional(),
    tagIds: z.array(idSchema).max(30).optional(),
  })
  .strict();
export const emptySchema = z.object({}).strict();
