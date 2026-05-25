import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
