import {
	TsonAbortError,
	TsonPromiseRejectionError,
	TsonStreamInterruptedError,
} from "../asyncErrors.js";
import { TsonAsyncType } from "../asyncTypes.js";

const ITERATOR_VALUE = 0;
const ITERATOR_ERROR = 1;
const ITERATOR_DONE = 2;
type SerializedIterableResult =
	| [typeof ITERATOR_DONE]
	| [typeof ITERATOR_ERROR, unknown]
	| [typeof ITERATOR_VALUE, unknown];

function isAsyncGeneratorFunction(value: unknown): value is () => AsyncGenerator<unknown, void, unknown> {
	return (
		!!value &&
		typeof value === "function" &&
		value.prototype[Symbol.toStringTag] === "AsyncGenerator"
	);
}

export const tsonAsyncGeneratorFunction: TsonAsyncType<
	() => AsyncGenerator<unknown, void, unknown>,
	SerializedIterableResult
> = {
	async: true,
	deserialize: (opts) => {
		// each value is stored in RAM for generator to be iterated many times
		const chunks: Exclude<Awaited<ReturnType<(typeof opts.reader)["read"]>>['value'], undefined>[] = []
		// we need to know if stream is done or just waiting, so that generator can stop looping
		let collectionDone = false
		// if generator is being iterated while data is still being collected, we need to be able to wait on the next chunks
		let resolveNext: () => void
		let promiseNext = new Promise<void>(resolve => resolveNext = resolve)

		/**
		 * Collects chunks from the stream until it's done
		 * - handle closing the stream
		 * - handle generating new promises for generator to wait on
		 */
		void async function collect() {
			let next: Awaited<ReturnType<(typeof opts.reader)["read"]>>;
			loop: while (((next = await opts.reader.read()), !next.done)) {
				const { value } = next
				chunks.push(value)
				if (value instanceof TsonStreamInterruptedError) {
					if (value.cause instanceof TsonAbortError) {
						opts.close()
						return
					}
					throw value // <-- is this `throw` necessary for "stream management" / "error reporting"? Or should we only throw in the generator?
				}
				switch (value[0]) {
					case ITERATOR_DONE: {
						opts.close();
						break loop;
					}
					case ITERATOR_ERROR: {
						opts.close();
						break;
					}
				}
				resolveNext!()
				promiseNext = new Promise<void>(resolve => resolveNext = resolve)
			}
			collectionDone = true
			resolveNext!()
		}()

		/**
		 * Generator that yields values from the stream
		 * - handles waiting for chunks if stream is still active
		 * - handles throwing errors from values
		 */
		return async function* generator() {
			await promiseNext
			for (let i = 0; i < chunks.length; i++) {
				const value = chunks[i]!
				if (value instanceof TsonStreamInterruptedError) {
					if (value.cause instanceof TsonAbortError) {
						return;
					}
					throw value;
				}
				switch (value[0]) {
					case ITERATOR_DONE: {
						return;
					}

					case ITERATOR_ERROR: {
						throw TsonPromiseRejectionError.from(value[1]);
					}

					case ITERATOR_VALUE: {
						yield value[1];
						break; // <-- breaks the switch, not the loop
					}
				}
				if (i === chunks.length - 1) {
					if (collectionDone) break
					await promiseNext
					if (collectionDone) break
				}
			}
		};
	},
	key: "AsyncGeneratorFunction",
	serializeIterator: async function* serialize(opts) {
		if (opts.value.length !== 0) {
			throw new Error(
				`AsyncGeneratorFunction must have 0 arguments to be serializable, got ${opts.value.length}`
			);
		}
		try {
			const iterator = opts.value()
			for await (const value of iterator) {
				yield [ITERATOR_VALUE, value];
			}

			yield [ITERATOR_DONE];
		} catch (err) {
			yield [ITERATOR_ERROR, err];
		}
	},
	test: isAsyncGeneratorFunction,
};
