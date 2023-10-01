export class TsonError extends Error {
	constructor(message: string) {
		super(message);
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
