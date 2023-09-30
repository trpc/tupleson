import { TsonType } from "../types.js";
import { isPlainObject } from "../utils.js";

export class UnknownObjectGuardError extends Error {
	public readonly value;

	constructor(value: unknown) {
		super(`Unknown object found`);
		this.name = this.constructor.name;
		this.value = value;
	}
}

/**
 * Guard against unknown complex objects
 * @remark Make sure to define this last in the list of types
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
