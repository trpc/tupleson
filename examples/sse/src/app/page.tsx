import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { StreamedTime } from "./StreamedTime";
import { StreamedTuple } from "./StreamedTuple";

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Qe7NQkqAiEG
 */
export default function Page() {
	return (
		<div className="flex flex-col h-screen justify-center items-center bg-muted">
			<Tabs className="w-[400px]" defaultValue="account" searchParam="tab">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="sse--finite">SSE Finite</TabsTrigger>
					<TabsTrigger value="sse--infinite">SSE infinite</TabsTrigger>
				</TabsList>
				<TabsContent value="sse--finite">
					<Card>
						<CardHeader>
							<CardTitle>Finite SSE stream</CardTitle>
							<CardDescription>
								Streams some numbers from the server.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<StreamedTuple />
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
							<StreamedTime />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
