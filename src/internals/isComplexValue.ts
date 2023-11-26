export function isComplexValue(arg: unknown): arg is object {
	return (arg !== null && typeof arg === "object") || typeof arg === "function";
}
