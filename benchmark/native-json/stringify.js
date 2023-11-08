export function nativeJSONStringify(value) {
	return JSON.stringify(value, replacer);
}

function dateReplacer(value) {
	return {
		__type: 'Date',
		iso: value.toISOString(),
	};
}

function regExpReplacer(value) {
	return {
		__type: 'RegExp',
		flags: value.flags,
		source: value.source,
	};
}

function setReplacer(value) {
	return {
		__type: 'Set',
		values: Array.from(value),
	};
}

function replacer(key, value) {
	if (typeof value === 'bigint') {
		return value.toString();
	} else if (typeof value === 'symbol') {
		return value.toString();
	} else if (typeof value === 'object') {
		if (value instanceof Date) {
			return dateReplacer(value);
		} else if (value instanceof RegExp) {
			return regExpReplacer(value);
		} else if (value instanceof Set) {
			return setReplacer(value);
		}

		return value;
	} else if (typeof value === 'string') {
		if (this[key] instanceof Date) {
			return dateReplacer(this[key]);
		}
	}

	// For primitives, use native function
	return value;
}
