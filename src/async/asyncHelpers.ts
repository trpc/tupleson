export async function* mapIterable<T, TValue>(
	iterable: AsyncIterable<T>,
	fn: (v: T) => TValue,
): AsyncIterable<TValue> {
	for await (const value of iterable) {
		yield fn(value);
	}
}

export async function reduceIterable<
	T,
	TInitialValue extends Promise<any> = Promise<T>,
	TKey extends PropertyKey | bigint = bigint,
	TKeyFn extends (prev?: TKey) => TKey = (prev?: TKey) => TKey,
>(
	iterable: Iterable<T>,
	fn: (acc: Awaited<TInitialValue>, v: T, i: TKey) => Awaited<TInitialValue>,
	initialValue: TInitialValue = Promise.resolve() as TInitialValue,
	incrementKey: TKeyFn = ((prev?: bigint) =>
		prev === undefined ? 0n : prev + 1n) as TKeyFn,
): Promise<Awaited<TInitialValue>> {
	let acc = initialValue;
	let i = incrementKey();

	for await (const value of iterable) {
		acc = fn(await acc, value, i);
		i = incrementKey(i);
	}

	return Promise.resolve(acc);
}
