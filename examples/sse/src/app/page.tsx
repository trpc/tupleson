import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { StreamedTupleSSE } from "./sse-finite/StreamedTupleSSE";
import { StreamedTimeSSE } from "./sse-infinite/StreamedTimeSSE";

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Qe7NQkqAiEG
 */
export default function Page() {
	return (
		<div className="flex flex-col h-screen justify-center items-center bg-muted">
			<Tabs className="w-[400px]" defaultValue="account" searchParam="tab">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="json-stream">JSON stream</TabsTrigger>
					<TabsTrigger value="sse--finite">SSE Finite</TabsTrigger>
					<TabsTrigger value="sse--infinite">SSE infinite</TabsTrigger>
				</TabsList>
				<TabsContent value="json-stream">
					<Card>
						<CardHeader>
							<CardTitle>JSON stream</CardTitle>
							<CardDescription>
								Streams some numbers from the server as a JSON stream.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<StreamedTupleSSE />
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
