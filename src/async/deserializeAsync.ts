/* eslint-disable @typescript-eslint/no-unused-vars */

import { TsonError } from "../errors.js"
import { assert } from "../internals/assert.js"
import { isTsonTuple } from "../internals/isTsonTuple.js"
import { mapOrReturn } from "../internals/mapOrReturn.js"
import {
	TsonNonce,
	TsonSerialized,
	TsonTransformerSerializeDeserialize,
} from "../types.js"
import {
	TsonAsyncIndex,
	TsonAsyncOptions,
	TsonAsyncStringifierIterable,
	TsonAsyncType,
} from "./asyncTypes.js"
import { TsonAsyncValueTuple } from "./serializeAsync.js"

type WalkFn = (value: unknown) => unknown
type WalkerFactory = (nonce: TsonNonce) => WalkFn

type AnyTsonTransformerSerializeDeserialize =
	| TsonAsyncType<any, any>
	| TsonTransformerSerializeDeserialize<any, any>

type TsonParseAsync = <TValue>(
	string: AsyncIterable<string> | TsonAsyncStringifierIterable<TValue>,
) => Promise<TValue>

function createDeferred<T>() {
	type PromiseResolve = (value: T) => void
	type PromiseReject = (reason: unknown) => void
	const deferred = {} as {
		promise: Promise<T>
		reject: PromiseReject
		resolve: PromiseResolve
	}
	deferred.promise = new Promise<T>((resolve, reject) => {
		deferred.resolve = resolve
		deferred.reject = reject
	})
	return deferred
}

type Deferred<T> = ReturnType<typeof createDeferred<T>>

function createSafeDeferred<T>() {
	const deferred = createDeferred()

	deferred.promise.catch(() => {
		// prevent unhandled promise rejection
	})
	return deferred as Deferred<T>
}

export function createTsonParseAsyncInner(opts: TsonAsyncOptions) {
	const typeByKey: Record<string, AnyTsonTransformerSerializeDeserialize> = {}

	for (const handler of opts.types) {
		if (handler.key) {
			if (typeByKey[handler.key]) {
				throw new Error(`Multiple handlers for key ${handler.key} found`)
			}

			typeByKey[handler.key] =
				handler as AnyTsonTransformerSerializeDeserialize
		}
	}

	return async (iterable: AsyncIterable<string>) => {
		// this is an awful hack to get around making a some sort of pipeline
		const cache = new Map<
			TsonAsyncIndex,
			{
				next: Deferred<unknown>
				values: unknown[]
			}
		>()
		const iterator = iterable[Symbol.asyncIterator]()

		const walker: WalkerFactory = (nonce) => {
			const walk: WalkFn = (value) => {
				if (isTsonTuple(value, nonce)) {
					const [type, serializedValue] = value
					const transformer = typeByKey[type]

					assert(transformer, `No transformer found for type ${type}`)

					const walkedValue = walk(serializedValue)
					if (!transformer.async) {
						return transformer.deserialize(walk(walkedValue))
					}

					const idx = serializedValue as TsonAsyncIndex

					const self = {
						next: createSafeDeferred(),
						values: [],
					}
					cache.set(idx, self)

					return transformer.deserialize({
						// abortSignal
						onDone() {
							cache.delete(idx)
						},
						stream: {
							[Symbol.asyncIterator]: () => {
								let index = 0
								return {
									next: async () => {
										const idx = index++

										if (self.values.length > idx) {
											return {
												done: false,
												value: self.values[idx],
											}
										}

										await self.next.promise

										return {
											done: false,
											value: self.values[idx],
										}
									},
								}
							},
						},
					})
				}

				return mapOrReturn(value, walk)
			}

			return walk
		}

		async function getStreamedValues(
			lines: string[],
			accumulator: string,
			walk: WalkFn,
		) {
			function readLine(str: string) {
				str = str.trimStart()

				if (str.startsWith(",")) {
					// ignore leading comma
					str = str.slice(1)
				}

				if (str.length < 2) {
					// minimum length is 2: '[]'
					return
				}

				const [index, result] = JSON.parse(str) as TsonAsyncValueTuple

				const item = cache.get(index)

				const walkedResult = walk(result)

				assert(item, `No deferred found for index ${index}`)

				// resolving deferred
				item.values.push(walkedResult)
				item.next.resolve(walkedResult)
				item.next = createSafeDeferred()
			}

			do {
				lines.forEach(readLine)
				lines.length = 0
				const nextValue = await iterator.next()
				if (!nextValue.done) {
					accumulator += nextValue.value
					const parts = accumulator.split("\n")
					accumulator = parts.pop() ?? ""
					lines.push(...parts)
				} else if (accumulator) {
					readLine(accumulator)
				}
			} while (lines.length)

			assert(!cache.size, `Stream ended with ${cache.size} pending promises`)
		}

		async function init() {
			let accumulator = ""

			// get the head of the JSON

			let lines: string[] = []
			do {
				const nextValue = await iterator.next()
				if (nextValue.done) {
					throw new TsonError("Unexpected end of stream before head")
				}
				accumulator += nextValue.value

				const parts = accumulator.split("\n")
				accumulator = parts.pop() ?? ""
				lines.push(...parts)
			} while (lines.length < 2)

			const [
				/**
				 * First line is just a `[`
				 */
				_firstLine,
				/**
				 * Second line is the shape of the JSON
				 */
				headLine,
				// .. third line is a `,`
				// .. fourth line is the start of the values array
				...buffer
			] = lines

			assert(headLine, "No head line found")

			const head = JSON.parse(headLine) as TsonSerialized<any>

			const walk = walker(head.nonce)

			try {
				return walk(head.json)
			} finally {
				getStreamedValues(buffer, accumulator, walk).catch((cause) => {
					// Something went wrong while getting the streamed values

					const err = new TsonError(
						`Stream interrupted: ${(cause as Error).message}`,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						{ cause },
					)

					// cancel all pending promises
					for (const deferred of cache.values()) {
						deferred.next.reject(err)
					}

					cache.clear()

					opts.onStreamError?.(err)
				})
			}
		}

		const result = await init().catch((cause: unknown) => {
			throw new TsonError("Failed to initialize TSON stream", { cause })
		})
		return [result, cache] as const
	}
}

export function createTsonParseAsync(opts: TsonAsyncOptions): TsonParseAsync {
	const instance = createTsonParseAsyncInner(opts)

	return (async (iterable) => {
		const [result] = await instance(iterable)

		return result
	}) as TsonParseAsync
}
