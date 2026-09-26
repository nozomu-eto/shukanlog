import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Cloudflare公式のテスト用サイトキー(常に成功する)。
// VITE_TURNSTILE_SITE_KEYが未設定の場合のフォールバックに使う
const TEST_SITE_KEY = "1x00000000000000000000AA";

interface TurnstileWidgetApi {
	render(
		container: HTMLElement,
		options: {
			sitekey: string;
			callback: (token: string) => void;
			"error-callback"?: () => void;
			"expired-callback"?: () => void;
		},
	): string;
	remove(widgetId: string): void;
	reset(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileWidgetApi;
	}
}

// challenges.cloudflare.com/turnstile/v0/api.js は、ページ内で1回だけ読み込む
let scriptLoadPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
	if (window.turnstile) {
		return Promise.resolve();
	}
	if (!scriptLoadPromise) {
		scriptLoadPromise = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = SCRIPT_SRC;
			script.async = true;
			script.defer = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error("Turnstileの読み込みに失敗しました"));
			document.head.appendChild(script);
		});
	}
	return scriptLoadPromise;
}

interface TurnstileProps {
	// トークンを取得できたら呼ぶ。期限切れ・エラー時はundefinedを渡してクリアする
	onTokenChange: (token: string | undefined) => void;
}

// Cloudflare Turnstile のウィジェット(explicit rendering)。
// 新規登録画面のbot対策として、サーバー側(turnstileMiddleware)がトークンをsiteverify APIで検証する。
// このコンポーネント自体は防御にならないが、トークンを取得してリクエストに付けるために必要
export function Turnstile({ onTokenChange }: TurnstileProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		loadTurnstileScript()
			.then(() => {
				if (cancelled || !containerRef.current || !window.turnstile) {
					return;
				}
				const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || TEST_SITE_KEY;
				widgetIdRef.current = window.turnstile.render(containerRef.current, {
					sitekey: siteKey,
					callback: (token) => onTokenChange(token),
					"error-callback": () => onTokenChange(undefined),
					"expired-callback": () => {
						// 期限切れになったら一度トークンをクリアし、ウィジェットをリセットして再チャレンジさせる
						onTokenChange(undefined);
						if (widgetIdRef.current) {
							window.turnstile?.reset(widgetIdRef.current);
						}
					},
				});
			})
			.catch(() => {
				// スクリプトの読み込みに失敗した場合はトークンを取得できないため、未取得のまま扱う
				onTokenChange(undefined);
			});

		return () => {
			cancelled = true;
			if (widgetIdRef.current) {
				window.turnstile?.remove(widgetIdRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- onTokenChangeは呼び出し側でuseStateのsetterを直接渡す想定で、変化しても再描画は不要
	}, []);

	return <div ref={containerRef} aria-label="Cloudflare Turnstile によるbot対策" />;
}
