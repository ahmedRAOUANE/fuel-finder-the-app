import { z } from "zod";

const EnvSchema = z.object({
    DATABASE_URL: z.url(),
    KINDE_CLIENT_ID: z.string().min(1),
    KINDE_CLIENT_SECRET: z.string().min(1),
    KINDE_ISSUER_URL: z.url(),
    KINDE_SITE_URL: z.url(),
    KINDE_POST_LOGOUT_REDIRECT_URL: z.url(),
    KINDE_POST_LOGIN_REDIRECT_URL: z.string().min(1),
    SUPER_ADMIN_EMAIL: z.email(),
    BACKBLAZE_KEY_ID: z.string().min(1),
    BACKBLAZE_APPLICATION_KEY: z.string().min(1),
    BACKBLAZE_BUCKET_NAME: z.string().min(1),
    BACKBLAZE_BUCKET_REGION: z.string().min(1),
    BACKBLAZE_ENDPOINT: z.url(),
});

export const env = EnvSchema.parse(process.env);