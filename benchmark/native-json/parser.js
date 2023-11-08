export function nativeJSONParse(value) {
	return JSON.parse(value, reviver);
}

function dateReviver(value) {
	return new Date(value.iso);
}

function regExpReviver(value) {
	return new RegExp(value.source, value.flags);
}

function setReviver(value) {
	return new Set(value.values);
}

function reviver(key, value) {
	if (typeof value === 'object' && value !== null) {
		if ('__type' in value) {
			switch (value.__type) {
				case 'Date':
					return dateReviver(value);
				case 'RegExp':
					return regExpReviver(value);
				case 'Set':
					return setReviver(value);
			}
		}
	}

	// For primitives, use native function
	return value;
}
