import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// vitest.config.tsでtest.globalsを有効にしていないため、
// @testing-library/reactの自動クリーンアップ(afterEachでのunmount)が効かない。
// 複数のitで同じ部品を描画するテスト(例: PasswordField.test.tsx)が
// 前のテストの描画と衝突しないよう、明示的にafterEachでcleanupする
afterEach(() => {
	cleanup();
});

// jsdomは<dialog>のshowModal()/close()を実装していないため、
// Dialogコンポーネント(T4)のテストが動くように最小限のポリフィルを入れる。
// open属性の付け外しと、close時のcloseイベント発火のみ行う(実ブラウザの完全な再現ではない)
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.setAttribute("open", "");
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		const wasOpen = this.hasAttribute("open");
		this.removeAttribute("open");
		if (wasOpen) {
			this.dispatchEvent(new Event("close"));
		}
	};
	// 実ブラウザはEscキーで開いているdialogにcancelイベントを送り、既定動作でclose()する。
	// jsdomはこの挙動を実装していないため、document側で最小限に再現する
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") {
			return;
		}
		const openDialog = document.querySelector("dialog[open]");
		if (!openDialog) {
			return;
		}
		const cancelEvent = new Event("cancel", { cancelable: true });
		const notPrevented = openDialog.dispatchEvent(cancelEvent);
		if (notPrevented) {
			(openDialog as HTMLDialogElement).close();
		}
	});
}
