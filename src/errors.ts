export class TsonError extends Error {
	constructor(...args: ConstructorParameters<typeof Error>) {
		super(...args);
		this.name = "TsonError";
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
