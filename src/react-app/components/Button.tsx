import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";
import styles from "./Button.module.css";

// ボタンの見た目の種類。docs/design.md 6章
// primary: 主要ボタン、secondary: 補助ボタン、danger: 取り消せない操作のボタン、inline: 下線のみの軽いボタン
export type ButtonVariant = "primary" | "secondary" | "danger" | "inline";

interface CommonProps {
	variant?: ButtonVariant;
	className?: string;
}

type AsButtonProps = CommonProps &
	ButtonHTMLAttributes<HTMLButtonElement> & {
		to?: undefined;
		href?: undefined;
	};

// アプリ内の画面遷移(react-router)用。ボタンと同じ見た目でaタグ(Link)にする
type AsLinkProps = CommonProps &
	Omit<LinkProps, "className"> & {
		href?: undefined;
	};

// mailtoや外部リンクなど、react-router Linkを使わないaタグ用
type AsAnchorProps = CommonProps &
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
		to?: undefined;
		href: string;
	};

type ButtonProps = AsButtonProps | AsLinkProps | AsAnchorProps;

// 主要・補助・取り消せない操作の3種類のボタン。
// to(アプリ内遷移)・href(外部リンク・mailto)を渡すとa要素として、それ以外はbutton要素として描画する。
// どちらの要素でも見た目(styles)は共通にする
export function Button({ variant = "primary", className, ...rest }: ButtonProps) {
	const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");

	if (rest.to !== undefined) {
		const { to, ...linkRest } = rest;
		return <Link to={to} className={classes} {...linkRest} />;
	}

	if (rest.href !== undefined) {
		const { href, ...anchorRest } = rest;
		// eslint-disable-next-line jsx-a11y/anchor-has-content -- 内容(children)は呼び出し側がanchorRestとして必ず渡す
		return <a href={href} className={classes} {...anchorRest} />;
	}

	return <button type="button" className={classes} {...rest} />;
}
