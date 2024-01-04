export function isComplexValue(arg: unknown): arg is object {
	if (typeof arg === "function") {
		throw new TypeError("Serializing functions is not currently supported.");
	}

	return arg !== null && typeof arg === "object";
}
