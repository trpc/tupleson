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

export const tsonUnknown: TsonType<unknown, never> = {
	test: (v) => {
		if (v && typeof v === "object" && !Array.isArray(v) && !isPlainObject(v)) {
			throw new UnknownObjectGuardError(v);
		}

		return false;
	},
	transform: false,
};
