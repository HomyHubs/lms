import { z } from 'zod'

/**
 * Question images (slice-12, ADR 0013). Assets are content-addressed and never overwritten, so an
 * attempt snapshot that names a media id keeps showing the same image after the question changes.
 */

export const MEDIA_MAX_BYTES = 2 * 1024 * 1024
export const MEDIA_MAX_DIMENSION = 4000
export const MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export const MediaMime = z.enum(MEDIA_MIME_TYPES)
export type MediaMime = z.infer<typeof MediaMime>

export function mediaUrl(id: string): string {
  return `/api/media/${id}`
}

export const MediaAsset = z.object({
  id: z.string().uuid(),
  mime: MediaMime,
  bytes: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  url: z.string(),
})
export type MediaAsset = z.infer<typeof MediaAsset>

export const MediaResponse = z.object({ media: MediaAsset })
export type MediaResponse = z.infer<typeof MediaResponse>

/** `stem` belongs to the question text; `option` to option `optionIndex` (0 = a). */
export const MediaSlot = z.enum(['stem', 'option'])
export type MediaSlot = z.infer<typeof MediaSlot>

export const QUESTION_MEDIA_MAX = 10

export const QuestionMediaItem = z
  .object({
    mediaId: z.string().uuid('Anh khong hop le'),
    slot: MediaSlot,
    optionIndex: z.number().int().min(0).max(25).nullable().default(null),
  })
  .strict()
  .refine((m) => (m.slot === 'option') === (m.optionIndex !== null), {
    message: 'Anh lua chon can chi so lua chon; anh de bai thi khong',
    path: ['optionIndex'],
  })
export type QuestionMediaItem = z.infer<typeof QuestionMediaItem>

/** Replaces all images of a question; array order is display order. One image per option. */
export const SetQuestionMediaRequest = z
  .object({ media: z.array(QuestionMediaItem).max(QUESTION_MEDIA_MAX, `Toi da ${QUESTION_MEDIA_MAX} anh moi cau`) })
  .strict()
  .superRefine((v, ctx) => {
    const options = v.media.filter((m) => m.slot === 'option').map((m) => m.optionIndex)
    if (new Set(options).size !== options.length) {
      ctx.addIssue({ code: 'custom', message: 'Moi lua chon chi gan 1 anh', path: ['media'] })
    }
  })
export type SetQuestionMediaRequest = z.infer<typeof SetQuestionMediaRequest>

export const QuestionMediaList = z.object({
  media: z.array(z.object({
    mediaId: z.string().uuid(),
    slot: MediaSlot,
    optionIndex: z.number().int().nullable(),
    url: z.string(),
  })),
})
export type QuestionMediaList = z.infer<typeof QuestionMediaList>
