"use client";

import { Fragment, useEffect, useState } from "react";

import type { ResponseShape } from "./api/sse/finite/route";

import { createEventSource } from "./tsonOptions";

export function StreamedTuple() {
	const [list, setList] = useState<null | number[]>(null);

	useEffect(() => {
		const abortSignal = new AbortController();
		createEventSource<ResponseShape>("/api/sse/finite", {
			signal: abortSignal.signal,
		})
			.then(async (shape) => {
				for await (const time of shape.finiteListGenerator) {
					setList((list) => [...(list ?? []), time]);
				}
			})
			.catch((err) => {
				console.error(err);
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
