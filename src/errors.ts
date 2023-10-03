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

export class TsonPromiseRejectionError extends TsonError {
	constructor(cause: unknown) {
		super(`Promise rejected`, { cause });
		this.name = "TsonPromiseRejectionError";
	}
}
