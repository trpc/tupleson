interface TsonGuardBase {
	key: string;
}
interface TsonAssertionGuard<T> extends TsonGuardBase {
	/**
	 * @param v - The value to assert
	 * @returns `void | true` if the value is of the type
	 * @returns `false` if the value is not of the type
	 * @throws `any` if the value is not of the type
	 */
	assert: ((v: any) => asserts v is T) | ((v: any) => v is T);
}

// // todo: maybe guard.parse can have guard.parse.input and guard.parse.output?
// interface TsonParserGuard<T> extends TsonGuardBase {
// 	/**
// 	 *
// 	 * @param v - The value to parse
// 	 * @returns {T} - A value that will be used in place of the original value
// 	 */
// 	parse: (v: any) => T;
// }

export type TsonGuard<T> = TsonAssertionGuard<T> /* | TsonParserGuard<T> */;
