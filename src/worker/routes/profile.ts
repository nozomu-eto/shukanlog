import { z } from "zod";

// PATCH /api/profile のリクエストボディ
export const patchProfileBodySchema = z.object({
	calorieTrackingEnabled: z.boolean(),
});
