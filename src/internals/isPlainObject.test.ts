import { expect, test } from "vitest";

import { isPlainObject } from "./isPlainObject.js";

test("should return true for plain objects", () => {
	expect(isPlainObject({})).toBe(true);
	expect(isPlainObject({ a: 1 })).toBe(true);
	expect(isPlainObject(Object.create(null))).toBe(true);
});

test("should return false for non-objects", () => {
	expect(isPlainObject(null)).toBe(false);
	expect(isPlainObject(undefined)).toBe(false);
	expect(isPlainObject(42)).toBe(false);
	expect(isPlainObject("foo")).toBe(false);
	expect(isPlainObject(true)).toBe(false);
	expect(isPlainObject(Symbol())).toBe(false);
});

test("should return false for non-plain objects", () => {
	expect(isPlainObject([])).toBe(false);
	expect(isPlainObject(new Date())).toBe(false);
	expect(isPlainObject(/foo/)).toBe(false);
	expect(
		isPlainObject(() => {
			// noop
		}),
	).toBe(false);

	expect(isPlainObject(Object.prototype)).toBe(false);
});
