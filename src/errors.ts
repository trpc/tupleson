export class TsonError extends Error {
	constructor(message: string, opts?: ErrorOptions) {
		super(message, opts);
		this.name = "TsonError";
	}
}

export class TsonAbortError extends TsonError {
	constructor(cause: unknown) {
		super(`TSON operation aborted`, { cause });
		this.name = "TsonAbortError";
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
