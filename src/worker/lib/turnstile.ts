const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
	success: boolean;
}

interface VerifyTurnstileTokenParams {
	token: string;
	secretKey: string;
	remoteIp?: string;
	// テストでCloudflareへの実際の通信を発生させずに差し替えられるようにする
	fetchImpl?: typeof fetch;
}

// Cloudflare TurnstileのsiteverifyAPIを呼び出し、トークンが有効かどうかを検証する
export async function verifyTurnstileToken({
	token,
	secretKey,
	remoteIp,
	fetchImpl = fetch,
}: VerifyTurnstileTokenParams): Promise<boolean> {
	const body = new FormData();
	body.append("secret", secretKey);
	body.append("response", token);
	if (remoteIp) {
		body.append("remoteip", remoteIp);
	}

	const res = await fetchImpl(SITEVERIFY_URL, { method: "POST", body });
	if (!res.ok) {
		return false;
	}

	const result = (await res.json()) as SiteverifyResponse;
	return result.success === true;
}
