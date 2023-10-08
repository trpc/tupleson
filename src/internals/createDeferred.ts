export function createDeferred<T = never>() {
	type PromiseResolve = (...args: T extends never ? [] : [T]) => void;
	type PromiseReject = (reason: unknown) => void;
	const deferred = {} as {
		promise: Promise<T>;
		reject: PromiseReject;
		resolve: PromiseResolve;
	};
	deferred.promise = new Promise<T>((resolve, reject) => {
		deferred.resolve = resolve as PromiseResolve;
		deferred.reject = reject;
	});
	return deferred;
}
