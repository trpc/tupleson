import { TsonError } from "../errors.js";
import { TsonType } from "../types.js";
import { TsonBranded, TsonTypeTesterCustom } from "../types.js";
import { serialized } from "../types.js";

export type TsonAsyncStringifierIterable<TValue> = AsyncIterable<string> & {
	[serialized]: TValue;
};

export type TsonAsyncStringifier = <TValue>(
	value: TValue,
	space?: number,
) => TsonAsyncStringifierIterable<TValue>;
export type TsonAsyncIndex = TsonBranded<number, "AsyncRegistered">;

export interface TsonTransformerSerializeDeserializeAsync<
	TValue,
	TSerializedValue,
> {
	async: true;
	/**
	 * From JSON-serializable value
	 */
	deserialize: (opts: {
		/**
		 * Abort signal from of the full stream
		 */
		// abortSignal: Promise<never>;
		/**
		 * The controller for the ReadableStream, to close when we're done
		 */
		controller: ReadableStreamDefaultController<TSerializedValue>;
		/**
		 * Reader for the ReadableStream of values
		 */
		reader: ReadableStreamDefaultReader<TSerializedValue>;
	}) => TValue;

	/**
	 * The key to use when serialized
	 */
	key: string;
	/**
	 * JSON-serializable value
	 */
	serializeIterator: (opts: {
		/**
		 * Abort signal from of the full stream
		 */
		// abortSignal?: AbortSignal;
		/**
		 * The value we're serializing
		 */
		value: TValue;
	}) => AsyncIterable<TSerializedValue>;
}

export interface TsonAsyncType<TValue, TSerializedValue>
	extends TsonTransformerSerializeDeserializeAsync<TValue, TSerializedValue>,
		TsonTypeTesterCustom {}
export interface TsonAsyncOptions {
	/**
	 * The nonce function every time we start serializing a new object
	 * Should return a unique value every time it's called
	 * @default `${crypto.randomUUID} if available, otherwise a random string generated by Math.random`
	 */
	nonce?: () => number | string;
	/**
	 * On stream error
	 */
	onStreamError?: (err: TsonError) => void;

	/**
	 * The list of types to use
	 */
	types: (
		| TsonAsyncType<any, any>
		| TsonType<any, any>
		| TsonType<any, never>
	)[];
}
