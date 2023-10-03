export class TsonError extends Error {
	constructor(message: string, opts?: ErrorOptions) {
		super(message, opts);
		this.name = this.constructor.name;
	}
}

export class CircularReferenceError extends TsonError {
	/**
	 * The circular reference that was found
	 */
	public readonly value;

	constructor(value: unknown) {
		super(`Circular reference detected`);
		this.name = this.constructor.name;
		this.value = value;
	}
}

export class PromiseRejectionError extends TsonError {
	constructor(cause: unknown) {
		super(`Promise rejected`, { cause });
		this.name = this.constructor.name;
	}
}
