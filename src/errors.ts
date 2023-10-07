import { isPlainObject } from "./internals/isPlainObject.js";

export class TsonError extends Error {
	constructor(message: string, opts?: ErrorOptions) {
		super(message, opts);
		this.name = "TsonError";

		// set prototype
	}
}

export class TsonCircularReferenceError extends TsonError {
	/**
	 * The circular reference that was found
	 */
	public readonly value;

	constructor(value: unknown) {
		super(`Circular reference detected`);
		this.name = "TsonCircularReferenceError";
		this.value = value;
	}
}

function getErrorMessageFromUnknown(unknown: unknown): null | string {
	if (typeof unknown === "string") {
		return unknown;
	}

	if (unknown instanceof Error) {
		return unknown.message;
	}

	if (isPlainObject(unknown) && typeof unknown["message"] === "string") {
		return unknown["message"];
	}

	return null;
}

export class TsonPromiseRejectionError extends TsonError {
	constructor(cause: unknown) {
		// get error message from cause if possible

		const message = getErrorMessageFromUnknown(cause) ?? "Promise rejected";
		super(message, { cause });
		this.name = "TsonPromiseRejectionError";
	}

	static from(cause: unknown) {
		return cause instanceof Error
			? cause
			: new TsonPromiseRejectionError(cause);
	}
}

export class TsonStreamInterruptedError extends TsonError {
	constructor(cause: unknown) {
		super(
			"Stream interrupted: " +
				(getErrorMessageFromUnknown(cause) ?? "unknown reason"),
			{ cause },
		);
		this.name = "TsonStreamInterruptedError";
	}
}
