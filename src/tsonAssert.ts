export const asserts = Symbol("asserted");
export type Not<T extends boolean> = T extends true ? false : true;

const secret = Symbol("secret");
type Secret = typeof secret;

export type IsNever<T> = [T] extends [never] ? true : false;
export type IsAny<T> = [T] extends [Secret] ? Not<IsNever<T>> : false;
export type IsUnknown<T> = [unknown] extends [T] ? Not<IsAny<T>> : false;
/**
 * The more I think about these semantics, the less they make sense.
 * What is this API, really? What is the goal?
 * Is it to provide a way to assert that a value is of a certain type? I think
 * this only makes sense in a few limited cases.
 *
 * 	At what point in the pipeline would this occur? Would this happen for all
 * 	values? If so, well... you've asserted that your parser only handles
 * 	the type you're asserting. I don't know why you'd want to predetermine
 * 	that at the time of configuration. Alternatively, if this isn't called
 *	for each value, then one of the following must be true:
 *
 * 		- you have also specified, somehow, *when* to apply this assertion
 * 		- it is part of an array of operations that are attempted in order,
 * 			and the first one that succeeds is used
 *
 * 	The first point could easily be accomplished by a conditional inside the
 * 	assertion function (e.g. for the number guard, If not of type 'number'
 * 	then it's definitely not NaN)... so no need for anything special like an
 *  array of type handler keys associated with the assertion.
 *
 * 	The second point is an option, since that's how custom tson types work.
 * 	But is there really any utility to that? We're not zod validating...
 * 	we're marshalling. We assume the type layer is accurate, without
 * 	enforcing it. If we want to integrate runtime type validation, that
 * 	seems like a feature request, potentially warranting it's own API.
 *
 * 	Ultimately, I feel like this functionality is easily served by a simple
 * 	assertion function that throws for invalid values. For most (all?) except
 * 	for the unknown object guard they would come first in the array, while
 * 	the unknown object guard would come last.
 */
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
