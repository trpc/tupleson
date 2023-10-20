import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { StreamedTupleJsonStream } from "./json-stream-finite/StreamedTupleJsonStream";
import { StreamedTupleSSE } from "./sse-finite/StreamedTupleSSE";
import { StreamedTimeSSE } from "./sse-infinite/StreamedTimeSSE";

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Qe7NQkqAiEG
 */
export default function Page() {
	return (
		<div className="flex flex-col h-screen justify-center items-center bg-muted">
			<Tabs
				className="w-[400px]"
				defaultValue="json-stream--finite"
				searchParam="tab"
			>
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="json-stream--finite">JSON stream</TabsTrigger>
					<TabsTrigger value="sse--finite">SSE Finite</TabsTrigger>
					<TabsTrigger value="sse--infinite">SSE infinite</TabsTrigger>
				</TabsList>
				<TabsContent value="json-stream--finite">
					<Card>
						<CardHeader>
							<CardTitle>JSON stream</CardTitle>
							<CardDescription>
								Streams some numbers from the server as a JSON stream.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<StreamedTupleJsonStream />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="sse--finite">
					<Card>
						<CardHeader>
							<CardTitle>Finite SSE stream</CardTitle>
							<CardDescription>
								Streams some numbers from the server.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<StreamedTupleSSE />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="sse--infinite">
					<Card>
						<CardHeader>
							<CardTitle>Infinite SSE stream</CardTitle>
							<CardDescription>
								Streams a timestamp from the server indefinitely.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<StreamedTimeSSE />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
