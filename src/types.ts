// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
const brand = Symbol("branded");

export type TsonBranded<TType, TBrand> = TType & { [brand]: TBrand };

export type TsonNonce = TsonBranded<string, "TsonNonce">;
export type TsonTypeHandlerKey = TsonBranded<string, "TsonTypeHandlerKey">;
export type TsonSerializedValue = unknown;

export type TsonTuple = [TsonTypeHandlerKey, TsonSerializedValue, TsonNonce];

// there's probably a better way of getting this type
export type TsonAllTypes =
	| "bigint"
	| "boolean"
	| "function"
	| "number"
	| "object"
	| "string"
	| "symbol"
	| "undefined";

type SerializedType =
	| Record<string, unknown>
	| boolean
	| number
	| string
	| unknown[];

export interface TsonTransformerNone {
	deserialize?: never;

	/**
	 * The key to use when serialized
	 */
	key?: never;
	serialize?: never;
}
export interface TsonTransformerSerializeDeserialize<
	TValue,
	TSerializedType extends SerializedType,
> {
	/**
	 * From JSON-serializable value
	 */
	deserialize: (v: TSerializedType) => TValue;

	/**
	 * The key to use when serialized
	 */
	key: string;
	/**
	 * JSON-serializable value
	 */
	serialize: (v: TValue) => TSerializedType;
}

export type TsonTransformer<TValue, TSerializedType extends SerializedType> =
	| TsonTransformerNone
	| TsonTransformerSerializeDeserialize<TValue, TSerializedType>;

export interface TsonTypeTesterPrimitive {
	/**
	 * The type of the primitive
	 */
	primitive: TsonAllTypes;
	/**
	 * Test if the value is of this type
	 */
	test?: (v: unknown) => boolean;
}
export interface TsonTypeTesterCustom {
	/**
	 * The type of the primitive
	 */
	primitive?: never;
	/**
	 * Test if the value is of this type
	 */
	test: (v: unknown) => boolean;
}

type TsonTypeTester = TsonTypeTesterCustom | TsonTypeTesterPrimitive;

export type TsonType<
	/**
	 * The type of the value
	 */
	TValue,
	/**
	 * JSON-serializable value how it's stored after it's serialized
	 */
	TSerializedType extends SerializedType,
> = TsonTypeTester & TsonTransformer<TValue, TSerializedType>;

export interface TsonOptions {
	nonce?: () => string;
	types: (TsonType<any, any> | TsonType<any, never>)[];
}

const serialized = Symbol("serialized");

export interface TsonSerialized<TValue = unknown> {
	json: TsonSerializedValue;
	nonce: TsonNonce;
	[serialized]: TValue;
}

export type TsonSerializeFn = <TValue>(obj: TValue) => TsonSerialized<TValue>;

export type TsonDeserializeFn = <TValue>(
	data: TsonSerialized<TValue>,
) => TValue;

type TsonStringified<TValue> = string & { [serialized]: TValue };

export type TsonStringifyFn = <TValue>(
	obj: TValue,
	space?: number | string,
) => TsonStringified<TValue>;

export type TsonParseFn = <TValue>(string: TsonStringified<TValue>) => TValue;
