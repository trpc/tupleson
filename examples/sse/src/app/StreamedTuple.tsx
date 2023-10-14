"use client";

import { useCallback, useEffect, useState } from "react";

import type { ResponseShape } from "./api/sse/finite/route";

import { createEventSource } from "./tsonOptions";

export function StreamedTuple() {
	const [list, setList] = useState<number[]>([]);

	const handleStream = useCallback(() => {
		const abortSignal = new AbortController();
		createEventSource<ResponseShape>("/api/sse/finite", {
			signal: abortSignal.signal,
		})
			.then(async (shape) => {
				for await (const item of shape.finiteListGenerator) {
					if (item === undefined) {
						throw new Error("item is undefined");
					}

					setList((list) => [...list, item]);
				}
			})
			.catch((err) => {
				console.error(err);
			});
	}, []);

	return (
		<div
			style={{
				alignItems: "center",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<button onClick={handleStream}>Stream</button>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					flexWrap: "wrap",
					justifyContent: "center",
				}}
			>
				{list.map((item, index) => (
					<div key={index}>{item}</div>
				))}
			</div>
		</div>
	);
}
