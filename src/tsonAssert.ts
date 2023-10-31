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
export interface TsonGuard<T> {
	/**
	 * A type assertion that narrows the type of the value
	 */
	assertion: <P = unknown>(
		v: P,
	) => asserts v is IsAny<P> extends true
		? T extends infer N extends P
			? N
			: T extends P
			? T
			: P & T
		: never;
	/**
	 * A unique identifier for this assertion
	 */
	key: string;
}

interface ValidationParser<TValue> {
	parse: (...args: unknown[]) => TValue;
}

export interface TsonAssert {
	is: <TSchema extends ValidationParser<TValue>, TValue = unknown>(
		schema: TSchema,
	) => TsonGuard<ReturnType<TSchema["parse"]>>;
	<TValue>(assertFn: ValidationParser<TValue>["parse"]): TsonGuard<TValue>;
}
/**
 * @param assertFn - A type assertion that narrows the type of the value
 * @function tsonAssert["is"] - returns a TsonGuard from a validation schema
 * @returns a new TsonGuard for use in configuring TSON.
 * The key of the guard is the name of the assertion function.
 */

const tsonAssert = <TValue>(assertFn: (v: unknown) => asserts v is TValue) =>
	({
		assertion: assertFn,
		key: assertFn.name,
	}) satisfies TsonGuard<TValue>;

/**
 * @param schema - A validation schema with a 'parse' method that throws an error
 * if the value is invalid
 * @returns a new TsonGuard for use in configuring TSON.
 */
tsonAssert.is = <TSchema extends ValidationParser<TValue>, TValue = unknown>(
	schema: TSchema,
) =>
	({
		assertion: schema.parse,
		key: schema.parse.name,
	}) satisfies TsonGuard<ReturnType<TSchema["parse"]>>;

export { tsonAssert };
