import { assert } from "../internals/assert.js";
import {
	NodeJSReadableStreamEsque,
	WebReadableStreamEsque,
} from "../internals/esque.js";
import { AsyncGenerator, Generator } from "../iterableTypes.js";

export async function* readableStreamToAsyncIterable<T>(
	stream:
		| NodeJSReadableStreamEsque
		| ReadableStream<T>
		| WebReadableStreamEsque,
): AsyncIterable<T> {
	if (Symbol.asyncIterator in stream) {
		// NodeJS.ReadableStream
		for await (const chunk of stream) {
			yield chunk as T;
		}

		return;
	}

	// Get a lock on the stream
	const reader = stream.getReader();

	try {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			// Read from the stream
			const result = await reader.read();

			// Exit if we're done
			if (result.done) {
				return;
			}

			// Else yield the chunk
			yield result.value as T;
		}
	} finally {
		reader.releaseLock();
	}
}

export async function* mapIterable<T, TValue>(
	iterable: AsyncIterable<T>,
	fn: (v: T) => TValue,
): AsyncIterable<TValue> {
	for await (const value of iterable) {
		yield fn(value);
	}
}

export function createReadableStream<TValue = unknown>() {
	let controller: ReadableStreamDefaultController<TValue> =
		null as unknown as ReadableStreamDefaultController<TValue>;
	const stream = new ReadableStream<TValue>({
		start(c) {
			controller = c;
		},
	});

	assert(controller, `Could not find controller - this is a bug`);

	return [stream, controller] as const;
}

/**
 * Creates an event that adheres to the [Event Stream format](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format)
 *
 * When called without any arguments, it returns a keep-alive event.
 * @param opts {{ data?: TData; event?: TEvent; id?: TId; retry?: TRetry }}
 * @param opts.data The data to send to the client. This value will be serialized to JSON.
 * @param opts.event The type of event to send to the client. Defaults to `message`.
 * @param opts.id The id of the event to send to the client, used to resume the connection.
 * @param opts.retry The reconnection time. If the connection to the server is lost, the
 * browser will wait for the specified time before attempting to reconnect.
 */
export function createServerEvent<
	const TData,
	const TEvent extends string,
	const TId extends string,
	const TRetry extends number,
>(opts: {
	data?: TData;
	/**
	 * The type of event to send to the client. Defaults to `message`.
	 * @default "message" when any other field is set, undefined otherwise
	 * @example ```ts
	 *  /// on the server
	 * createServerEvent({ event: "answer", data: 42 })
	 * createServerEvent({ event: "close" })
	 * /// on the client
	 * const eventSource = new EventSource("/sse");
	 * let answer;
	 * eventSource.addEventListener("answer", (e) => {
	 * 	answer = e.data;
	 * })
	 * eventSource.addEventListener("close", () => {
	 * 	eventSource.close();
	 * })
	 * ```
	 */
	event?: TEvent;
	/**
	 * The id of the event to send to the client, used to resume the connection.
	 * When the EventSource client reconnects, it will send the last id it
	 * received via the `Last-Event-ID` header (though the header can also be
	 * set manually). The server will then resume the connection and send all
	 * events that happened since the last event with that id.
	 * @default undefined
	 */
	id?: TId;
	/**
	 * The reconnection time. If the connection to the server is lost, the
	 * browser will wait for the specified time before attempting to reconnect.
	 * This must be an integer, specifying the reconnection time in
	 * milliseconds. If a non-integer value is specified it will be rounded
	 * down to the nearest integer. The default value is 1000 ms (1 second).
	 */
	retry?: TRetry;
}): string {
	const { data, event, id, retry } = opts;

	// Lines starting with a colon are essentially comments, and are ignored.
	// An event consisting solely of a comment is equivalent to a keep-alive.
	// By setting
	const emptyLine = ":\n";

	return (
		emptyLine +
		addIfProvided("event", event) +
		addIfProvided("id", id) +
		addIfProvided("retry", retry) +
		addIfProvided("data", data) +
		"\n"
	);
}

function addIfProvided<TKey extends "data" | "event" | "id" | "retry">(
	key: TKey,
	value: Parameters<typeof createServerEvent>[0][TKey],
) {
	if (value === undefined) {
		return "";
	}

	if (key === "data") {
		return `data: ${JSON.stringify(value)}\n`;
	}

	return `${key}: ${value as any}\n`;
}

export interface AsyncIterableEsque<T = unknown> {
	[Symbol.asyncIterator](): AsyncIterator<T>;
}

export function isAsyncIterableEsque(
	maybeAsyncIterable: unknown,
): maybeAsyncIterable is AsyncIterableEsque & AsyncIterable<unknown> {
	return (
		!!maybeAsyncIterable &&
		(typeof maybeAsyncIterable === "object" ||
			typeof maybeAsyncIterable === "function") &&
		Symbol.asyncIterator in maybeAsyncIterable
	);
}

export interface IterableEsque {
	[Symbol.iterator](): unknown;
}

export function isIterableEsque(
	maybeIterable: unknown,
): maybeIterable is IterableEsque {
	return (
		!!maybeIterable &&
		(typeof maybeIterable === "object" ||
			typeof maybeIterable === "function") &&
		Symbol.iterator in maybeIterable
	);
}

type GeneratorFnEsque = (() => AsyncGenerator) | (() => Generator);

export function isAsyncGeneratorFn(
	maybeAsyncGeneratorFn: unknown,
): maybeAsyncGeneratorFn is GeneratorFnEsque {
	return (
		typeof maybeAsyncGeneratorFn === "function" &&
		["AsyncGeneratorFunction", "GeneratorFunction"].includes(
			maybeAsyncGeneratorFn.constructor.name,
		)
	);
}

export type PromiseEsque = PromiseLike<unknown>;

export function isPromiseEsque(
	maybePromise: unknown,
): maybePromise is PromiseEsque {
	return (
		!!maybePromise &&
		typeof maybePromise === "object" &&
		"then" in maybePromise &&
		typeof maybePromise.then === "function"
	);
}

export type ThunkEsque = () => unknown;

export function isThunkEsque(maybeThunk: unknown): maybeThunk is ThunkEsque {
	return (
		!!maybeThunk && typeof maybeThunk === "function" && maybeThunk.length === 0
	);
}

export type Thunkable =
	| AsyncIterableEsque
	| GeneratorFnEsque
	| IterableEsque
	| PromiseEsque
	| ThunkEsque;

export type MaybePromise<T> = Promise<T> | T;
