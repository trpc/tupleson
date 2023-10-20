"use client";

import { useEffect, useState } from "react";

import { createEventSource, isAbortError } from "~/tsonOptions";

import type { ResponseShape } from "./route";

export function StreamedTimeSSE() {
	const [time, setTime] = useState("....");
	useEffect(() => {
		const abortSignal = new AbortController();
		createEventSource<ResponseShape>("/sse-infinite", {
			reconnect: true,
			signal: abortSignal.signal,
		})
			.then(async (shape) => {
				for await (const time of shape.currentTimeGenerator) {
					setTime(time);
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
	return <>{time}</>;
}
