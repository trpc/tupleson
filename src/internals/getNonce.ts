import { TsonNonce } from "../types.js";

const randomString = () => Math.random().toString(36).slice(2);

export type GetNonce = () => TsonNonce;

// istanbul ignore next
export const getNonce: GetNonce =
	typeof crypto === "object" && typeof crypto.randomUUID === "function"
		? () => crypto.randomUUID() as TsonNonce
		: () =>
				[randomString(), randomString(), randomString()].join("") as TsonNonce;