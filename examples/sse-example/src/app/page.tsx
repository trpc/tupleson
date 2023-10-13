import { StreamedTime } from "./StreamedTime";

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Qe7NQkqAiEG
 */
export default function Page() {
	return (
		<section className="flex h-screen justify-center items-center bg-gray-100 dark:bg-gray-800">
			<div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md">
				<h1 className="text-2xl text-center text-gray-800 dark:text-gray-200">
					<StreamedTime />
				</h1>
			</div>
		</section>
	);
}
