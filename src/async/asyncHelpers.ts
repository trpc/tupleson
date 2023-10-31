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
	TKey extends PropertyKey = number,
	TKeyFn extends (prev: TKey) => TKey = (prev: TKey) => TKey,
>(
	iterable: AsyncIterable<T>,
	fn: (acc: Awaited<TInitialValue>, v: T, i: TKey) => Awaited<TInitialValue>,
	initialValue: TInitialValue = Promise.resolve() as TInitialValue,
	initialKey: TKey = 0 as TKey,
	incrementKey: TKeyFn = ((prev) => (prev as number) + 1) as TKeyFn,
): Promise<Awaited<TInitialValue>> {
	let acc = initialValue;
	let i = initialKey;

	for await (const value of iterable) {
		acc = fn(await acc, value, i);
		i = incrementKey(i);
	}

	return Promise.resolve(acc);
}
