export interface Thenable <R> {
    then <U> (onFulfilled?: (value: R) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
    then <U> (onFulfilled?: (value: R) => U | Thenable<U>, onRejected?: (error: any) => void): Thenable<U>;
}

type State =
    // May transition to either the fulfilled or rejected state.
    | 'PENDING'
    // Must not transition to any other state.
    // Must have a value, which must not change.
    | 'FULFILLED'
    // Must not transition to any other state.
    // Must have a reason, which must not change.
    | 'REJECTED';

type OnFulfilled<T, U = any> = (value: T) => U | Thenable<U>;
type OnRejected<U = any> = (reason: any) => U | Thenable<U>;

export class SyncPromise<T = any> implements Thenable<T> {

    /**
     * The state of the promise.
     */
    private state: State;
    /**
     * The valued stored by the promise.
     */
    private value?: T;

    /**
     * Store a reference to each callback of this promise, by lifecycle state.
     */
    private callbacks: {[key: string]: OnFulfilled<T>[] | OnRejected[] } = {
        onResolve: [] as OnFulfilled<T>[],
        onReject: [] as OnRejected[]
    };

    constructor(
        executor: (
            resolve: (value?: T | Thenable<T>) => void,
            reject: (error?: any) => void
        ) => void
    ) {
        this.value = undefined;
        this.state = 'PENDING';
        try {
            // Execute immediately before even returning the Promise object.
            executor(this.resolve.bind(this), this.reject.bind(this));
        } catch (error) {
            // Automatically reject if a non-handled error occurs.
            this.reject(error);
        }
    }

    /**
     * Resolves a promise and executes all enqueued callbacks associated to a successful resolution.
     * @param value
     */
    private fulfill(value: T) {
        if (this.getState() !== "PENDING") return;
        this.state = "FULFILLED";
        this.value = value;
        this.callbacks.onResolve.forEach(onResolve => onResolve(value));
        this.cleanCallbacks();
    }

    /**
     * Rejects a promise and executes all enqueued callbacks associated to a failed resolution.
     * @param error
     */
    private reject(error?: any): void {
        if (this.getState() !== "PENDING") return;
        this.state = "REJECTED";
        this.value = error;
        this.callbacks.onReject.forEach(onRejected => onRejected(error));
        this.cleanCallbacks();
    }

    /**
     * Runs the promise resolution procedure.
     * @param value
     */
    private resolve(value?: T | Thenable<T>): void {
        if (value === this) {
            this.reject(new TypeError('promise and value refer to the same object'));
        } else if (value instanceof SyncPromise) {
            // If value is a promise, adopt its state
            const other = value;
            switch (other.getState()) {
                case 'PENDING':
                    // 2.3.2.1 If other is pending, promise must remain pending until other is fulfilled or rejected
                    other.then((otherResult) => this.resolve(otherResult), (error) => this.reject(error));
                    break;
                case 'FULFILLED':
                    // 2.3.2.2 If/when other is fulfilled, fulfill promise with the same value
                    this.fulfill(other.value);
                    break;
                case 'REJECTED':
                    // 2.3.2.3 If/when other is rejected, reject promise with the same reason
                    this.reject(other.value);
                    break;
            }
        } else if (typeof value === 'function' || isObject(value)) {
            try {
                // 2.3.3.1 Let then be x.then
                const then = (value as any).then;
                if (typeof then === 'function') {
                    // 2.3.3.3 If then is a function, call it with value as this, first argument resolvePromise, and second argument rejectPromise
                    let called = false;
                    try {
                        then((y: any) => { // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)
                            if (called === true) return;
                            // 2.3.3.3.3 If both resolvePromise and rejectPromise are called,
                            // or multiple calls to the same argument are made,
                            // the first call takes precedence, and any further calls are ignored
                            called = true;
                            this.resolve(y);
                        }, (r: any) => { // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r
                            if (called === true) return;
                            // 2.3.3.3.3 If both resolvePromise and rejectPromise are called,
                            // or multiple calls to the same argument are made,
                            // the first call takes precedence, and any further calls are ignored
                            called = true;
                            this.reject(r);
                        });
                    } catch (e) {
                        // 2.3.3.3.4 If calling then throws an exception e,
                        // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
                        if (!called) {
                            // 2.3.3.3.4.2 Otherwise, reject promise with e as the reason
                            called = true;
                            this.reject(e);
                        }
                    }
                } else {
                    this.fulfill(value as T);
                }
            } catch (error) {
                // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
                this.reject(error);
            }
        } else {
            this.fulfill(value as T);
        }
    }

    /**
     * Access the current or eventual value of this promise.
     * @param onFulfilled
     * @param onRejected
     */
    then<U = any>(onFulfilled?: OnFulfilled<T>, onRejected?: OnRejected): SyncPromise<U> {
        switch (this.getState()) {
            case "FULFILLED":
                try {
                    if (onFulfilled == null) {
                        return this as SyncPromise<any>;
                    } else {
                        return SyncPromise.resolve(onFulfilled(this.value!));
                    }
                } catch (error) {
                    // handle possible errors thrown by onFulfilled.
                    return SyncPromise.reject(error);
                }
            case "REJECTED":
                try {
                    if (onRejected == null) {
                        return this as SyncPromise<any>;
                    } else {
                        // The error is handled by onRejected, it return a fulfilled promise.
                        return SyncPromise.resolve(onRejected(this.value));
                    }
                } catch (error) {
                    // handle possible errors thrown by onRejected.
                    return SyncPromise.reject(error);
                }
            case "PENDING":
                return new SyncPromise<U>((resolve, reject) => {
                    this.callbacks.onResolve.push((value: T) => {
                        try {
                            if (onFulfilled != null) {
                                resolve(onFulfilled(value));
                            } else {
                                resolve(value as unknown as U);
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                    this.callbacks.onReject.push((error: any) => {
                        try {
                            if (onRejected != null) {
                                resolve(onRejected(error));
                            } else {
                                reject(error);
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
        }
    }

    catch<U>(onRejected: OnRejected): SyncPromise<U> {
        return this.then(undefined, onRejected);
    }

    /**
     * Make a new promise from the thenable.
     * A thenable is promise-like in as far as it has a "then" method.
     */
    static resolve (): SyncPromise<void>;
    static resolve<U>(value: U | Thenable<U>): SyncPromise<U>;
    static resolve(value?: any): SyncPromise<any> {
        // Wrap the value in a new SyncPromise.
        // Note that if value is a Thenable the resulting promise will adopt its state and value.
        // @see private resolve method.
        return new SyncPromise((resolve) => resolve(value));
    }

    /**
     * Make a promise that rejects to obj. For consistency and debugging (eg stack traces), obj should be an instanceof Error
     */
    static reject <R> (error?: any): SyncPromise<R> {
        return new SyncPromise(( _ , reject) => reject(error));
    }

    /**
     * Make a promise that fulfills when every item in the array fulfills, and rejects if (and when) any item rejects.
     * the array passed to all can be a mixture of promise-like objects and other objects.
     * The fulfillment value is an array (in order) of fulfillment values. The rejection value is the first rejection value.
     *
     * Note that we implemented the all method iteratively for better performance (mainly in terms of memory)
     * and to guarantee two desired quality-requirements:
     *  1) As soon as an item rejects, the whole all should be rejected.
     *  2) The rejection value is the first rejection value.
     */
    static all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>, T8 | Thenable<T8>, T9 | Thenable<T9>, T10 | Thenable<T10>]): SyncPromise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
    static all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>, T8 | Thenable<T8>, T9 | Thenable<T9>]): SyncPromise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
    static all<T1, T2, T3, T4, T5, T6, T7, T8>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>, T8 | Thenable<T8>]): SyncPromise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
    static all<T1, T2, T3, T4, T5, T6, T7>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>]): SyncPromise<[T1, T2, T3, T4, T5, T6, T7]>;
    static all<T1, T2, T3, T4, T5, T6>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>, T5 | Thenable<T5>, T6 | Thenable<T6>]): SyncPromise<[T1, T2, T3, T4, T5, T6]>;
    static all<T1, T2, T3, T4, T5>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>, T5 | Thenable<T5>]): SyncPromise<[T1, T2, T3, T4, T5]>;
    static all<T1, T2, T3, T4>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable <T4>]): SyncPromise<[T1, T2, T3, T4]>;
    static all<T1, T2, T3>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>]): SyncPromise<[T1, T2, T3]>;
    static all<T1, T2>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>]): SyncPromise<[T1, T2]>;
    static all<T1>(values: [T1 | Thenable<T1>]): SyncPromise<[T1]>;
    // tslint:disable-next-line:array-type
    static all<TAll>(values: Array<TAll | Thenable<TAll>>): SyncPromise<TAll[]> {
        return new SyncPromise((resolve, reject) => {
            const returns = [] as TAll[];
            values.forEach((value) => {
                SyncPromise.resolve(value).then(res => {
                    const size = returns.push(res);
                    if (size === values.length) {
                        resolve(returns);
                    }
                }, error => reject(error));
            });
        });
    }


    /**
     * Make a SyncPromise that fulfills when any item fulfills, and rejects if any item rejects.
     */
    static race <R> (promises: (R | Thenable<R>)[]): SyncPromise<R> {
        return new SyncPromise<R>((resolve, reject) => {
            promises.forEach(promise =>
                // If it was a value, then it is lifted to a fulfilled promise, otherwise the
                // state and the value of the thenable will be adopted.
                SyncPromise.resolve(promise).then(
                    value => resolve(value),
                    error => reject(error)
                )
            )
        });
    }

    /**
     * Cancel all enqueued callbacks.
     */
    private cleanCallbacks() {
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = [];
        });
    }

    public getState() {
        return this.state;
    }
}

function isObject<U>(value: any): value is object {
    return value !== null && typeof value === 'object'
}
