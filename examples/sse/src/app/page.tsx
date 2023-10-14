import { StreamedTime } from "./StreamedTime";
import { StreamedTuple } from "./StreamedTuple";

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Qe7NQkqAiEG
 */
export default function Page() {
	return (
		<section className="flex flex-col h-screen justify-center items-center bg-gray-100 dark:bg-gray-800 space-y-6">
			<div className="space-y-2">
				<div className="space-y-2">
					<h2 className="text-2xl text-center text-gray-800 dark:text-gray-200">
						Infinite stream
					</h2>
					<div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
						<div className="text-2xl text-center text-gray-800 dark:text-gray-200 font-mono">
							<StreamedTime />
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<h2 className="text-2xl text-center text-gray-800 dark:text-gray-200">
					Finite stream
				</h2>
				<div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
					<div className="text-2xl text-center text-gray-800 dark:text-gray-200 font-mono">
						<StreamedTuple />
					</div>
				</div>
			</div>
		</section>
	);
}
