"use client";

import { useEffect, useState } from "react";

import type { ResponseShape } from "./api/sse/infinite/route";

import { createEventSource, isAbortError } from "./tsonOptions";

export function StreamedTime() {
	const [time, setTime] = useState("....");
	useEffect(() => {
		const abortSignal = new AbortController();
		createEventSource<ResponseShape>("/api/sse/infinite", {
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
