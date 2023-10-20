"use client";

import { Fragment, useEffect, useState } from "react";

import { isAbortError, parseJsonStreamResponse } from "~/tsonOptions";

import type { ResponseShape } from "./route";

export function StreamedTupleJsonStream() {
	const [list, setList] = useState<null | number[]>(null);

	useEffect(() => {
		const abortSignal = new AbortController();

		fetch("/json-stream-finite", {
			signal: abortSignal.signal,
		})
			.then((res) => {
				return parseJsonStreamResponse<ResponseShape>(res);
			})
			.then(async (shape) => {
				for await (const time of shape.finiteListGenerator) {
					setList((list) => [...(list ?? []), time]);
				}
			})
			.catch((err) => {
				if (isAbortError(err)) {
					console.log("aborted - might be React doing its double render thing");
				} else {
					console.error(err);
				}
			});

		return () => {
			abortSignal.abort();
		};
	}, []);

	return (
		<>
			{list?.map((item, index) => <Fragment key={index}>{item}</Fragment>) ??
				"...."}
		</>
	);
}
