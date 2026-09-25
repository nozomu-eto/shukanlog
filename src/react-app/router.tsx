import { createBrowserRouter } from "react-router-dom";
import { RootRoute } from "./routes/root";

// 画面のルーティング定義。実際のページ構成はステップ1のT13で design.md 8章に沿って整備する
export const router = createBrowserRouter([
	{
		path: "/",
		element: <RootRoute />,
	},
]);
