import { TsonError } from "../../errors.js";
import { isPlainObject } from "../../internals/isPlainObject.js";
import { TsonGuard } from "../../tsonAssert.js";

export class TsonUnknownObjectGuardError extends TsonError {
	/**
	 * The unknown object that was found
	 */
	public readonly value;

	constructor(value: unknown) {
		super(`Unknown object found`);
		this.name = this.constructor.name;
		this.value = value;

		this.name = "TsonUnknownObjectGuardError";
	}
}

/**
 *
 * @description
 * Guard against unknown complex objects.
 * Make sure to define this last in the list of types.
 * @throws {TsonUnknownObjectGuardError} if an unknown object is found
 */
export const tsonUnknownObjectGuard: TsonGuard<NonNullable<unknown>> = {
	assert(v: unknown) {
		if (v && typeof v === "object" && !Array.isArray(v) && !isPlainObject(v)) {
			throw new TsonUnknownObjectGuardError(v);
		}
	},
	key: "tsonUnknownObjectGuard",
};
