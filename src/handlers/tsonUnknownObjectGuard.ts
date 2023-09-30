import { isPlainObject } from "../isPlainObject.js";
import { TsonType } from "../types.js";

export class UnknownObjectGuardError extends Error {
	/**
	 * The unknown object that was found
	 */
	public readonly value;

	constructor(value: unknown) {
		super(`Unknown object found`);
		this.name = this.constructor.name;
		this.value = value;
	}
}

/**
 *
 * @description
 * Guard against unknown complex objects.
 * Make sure to define this last in the list of types.
 * @throws {UnknownObjectGuardError} if an unknown object is found
 */
export const tsonUnknownObjectGuard: TsonType<unknown, never> = {
	test: (v) => {
		if (v && typeof v === "object" && !Array.isArray(v) && !isPlainObject(v)) {
			throw new UnknownObjectGuardError(v);
		}

		return false;
	},
};
