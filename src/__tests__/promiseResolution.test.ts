import { SyncPromise, Thenable } from "../promise";

// tslint:disable:no-empty no-string-literal

describe('If promise and x refer to the same object, reject promise with a TypeError as the reason.', () => {
    it('via return from a fulfilled promise (manually calling private resolve method)', () => {
        const promise = new SyncPromise(() => {
        });
        const onRejected = jest.fn().mockImplementation((error) => {
            expect(error).toEqual(expect.any(TypeError));
        });
        const onFulfilled = jest.fn();
        promise.then(onFulfilled, onRejected);
        promise['resolve'](promise);
        expect(onFulfilled).not.toBeCalled();
        expect(onRejected).toBeCalled();
    });
    it('via return from a fulfilled promise', () => {
        const promise: any = new SyncPromise(resolve => {
            setTimeout(() => {
                resolve(promise);
                expect(onFulfilled).not.toBeCalled();
                expect(onRejected).toBeCalled();
            }, 0);
        });
        const onRejected = jest.fn().mockImplementation((error) => {
            expect(error).toEqual(expect.any(TypeError));
        });
        const onFulfilled = jest.fn();
        return promise.then(onFulfilled, onRejected);
    });
});

describe('2.3.2: If x is a promise, adopt its state', () => {
    describe('2.3.2.1 If x is pending, promise must remain pending until x is fulfilled or rejected.', () => {
        beforeEach(() => jest.useFakeTimers());

        it('via return from a fulfilled promise', () => {
            const promise = SyncPromise.resolve().then(() => new SyncPromise(() => {}));
            const onFulfilled = jest.fn();
            const onRejected = jest.fn();
            promise.then(onFulfilled, onRejected);
            setTimeout(() => {
                expect(onFulfilled).not.toBeCalled();
                expect(onRejected).not.toBeCalled();
                expect(promise.getState()).toBe('PENDING');
            }, 100);
            jest.runAllTimers();
        });
        it('via return from a rejected promise', () => {
            const promise = SyncPromise.reject('error').catch( () => new SyncPromise(() => {}));
            const onFulfilled = jest.fn();
            const onRejected = jest.fn();
            promise.then(onFulfilled, onRejected);
            setTimeout(() => {
                expect(onFulfilled).not.toBeCalled();
                expect(onRejected).not.toBeCalled();
                expect(promise.getState()).toBe('PENDING');
            }, 100);
            jest.runAllTimers();
        });
    });
    describe('2.3.2.2 If/when x is fulfilled, fulfill promise with the same value.', () => {
        beforeEach(() => jest.useFakeTimers());

        function asyncFulfilledPromise(): SyncPromise<number> {
            return new SyncPromise((resolve) => setTimeout(() => resolve(10), 100));
        }

        function tester(promise: SyncPromise<number>, useTimers = false): Promise<any> {
            const onFulfilled = jest.fn();
            const onRejected = jest.fn();
            promise.then(onFulfilled, onRejected);
            if (useTimers) jest.runAllTimers();
            expect(onFulfilled).toBeCalled();
            expect(onRejected).not.toBeCalled();
            expect(promise.getState()).toBe('FULFILLED');
            return expect(promise).resolves.toBe(10);
        }
        it('via return from a fulfilled promise, x is already fulfilled', () => {
            const promise = SyncPromise.resolve().then(() => SyncPromise.resolve(10));
            return tester(promise);
        });
        it('via creation of the fulfilled promise with x of type promise, x is already fulfilled', () => {
            const promise = SyncPromise.resolve(SyncPromise.resolve(10));
            return tester(promise)
        });
        it('via return from a rejected promise, x is already fulfilled', () => {
            const promise: SyncPromise<number> = SyncPromise.reject('error')
                .catch(() => SyncPromise.resolve(10));
            return tester(promise);
        });
        it('via return from a fulfilled promise, x is eventually-fulfilled', () => {
            const promise = SyncPromise.resolve().then(asyncFulfilledPromise);
            return tester(promise, true);
        });
        it('via creation of the fulfilled promise with x of type promise, x is eventually-fulfilled', () => {
            const promise = SyncPromise.resolve(asyncFulfilledPromise());
            return tester(promise, true);
        });
        it('via return from a rejected promise, x is eventually-fulfilled', () => {
            const promise: SyncPromise<number> = SyncPromise.reject('error')
                .catch(asyncFulfilledPromise);
            return tester(promise, true);
        });
    });

    describe('2.3.2.3 If/when x is rejected, reject promise with the same reason.', () => {
        beforeEach(() => jest.useFakeTimers());

        function asyncRejectedPromise(): SyncPromise<string> {
            return new SyncPromise((_ , reject) => setTimeout(() => reject('error'), 100));
        }

        function tester(promise: SyncPromise<string>, useTimers = false): Promise<any> {
            const onFulfilled = jest.fn();
            const onRejected = jest.fn();
            promise.then(onFulfilled, onRejected);
            if (useTimers) jest.runAllTimers();
            expect(onFulfilled).not.toBeCalled();
            expect(onRejected).toBeCalled();
            expect(promise.getState()).toBe('REJECTED');
            return expect(promise).rejects.toBe('error');
        }
        it('via return from a fulfilled promise, x is already rejected', () => {
            const promise = SyncPromise.resolve().then(() => SyncPromise.reject('error'));
            return tester(promise);
        });
        it('via creation of the fulfilled promise with x of type promise, x is already fulfilled', () => {
            const promise = SyncPromise.resolve<string>(SyncPromise.reject('error'));
            return tester(promise)
        });
        it('via return from a rejected promise, x is already fulfilled', () => {
            const promise = SyncPromise.reject('error')
                .catch<string>(() => SyncPromise.reject('error'));
            return tester(promise);
        });
        it('via return from a fulfilled promise, x is eventually-fulfilled', () => {
            const promise = SyncPromise.resolve().then(asyncRejectedPromise);
            return tester(promise, true);
        });
        it('via creation of the fulfilled promise with x of type promise, x is eventually-fulfilled', () => {
            const promise = SyncPromise.resolve(asyncRejectedPromise());
            return tester(promise, true);
        });
        it('via return from a rejected promise, x is eventually-fulfilled', () => {
            const promise = SyncPromise.reject('error')
                .catch<string>(asyncRejectedPromise);
            return tester(promise, true);
        });
    });
});


describe('2.3.3.1 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.', () => {

    const error = new Error('error');
    const inaccessibleThenable = Object.create(null, {
        then: { get: () => { throw error } }
    });

    it('via a synchronously-resolved promise', () => {
        const promise = new SyncPromise((resolve) => resolve(inaccessibleThenable));
        const onRejected = jest.fn().mockImplementation((error) => expect(error).toBe(error));
        const onFulfilled = jest.fn();
        const promise2 = promise.then(onFulfilled, onRejected);
        expect(onFulfilled).not.toHaveBeenCalled();
        expect(onRejected).toHaveBeenCalledWith(error);
        return promise2;
    });
    it('via an asynchronously-resolved promise', () => {
        jest.useFakeTimers();
        const promise = new SyncPromise((resolve) => setTimeout(() => resolve(inaccessibleThenable), 0));
        const onRejected = jest.fn().mockImplementation((error) => expect(error).toBe(error));
        const onFulfilled = jest.fn();
        const promise2 = promise.then(onFulfilled, onRejected);
        jest.runAllTimers();
        expect(onFulfilled).not.toHaveBeenCalled();
        expect(onRejected).toHaveBeenCalledWith(error);
        return promise2;
    });
});

describe('2.3.3(.3) Otherwise, if x is Thenable call it with x as this, first argument resolvePromise, and second argument rejectPromise, where:', () => {
    describe('2.3.3.3 x is this, resolvePromise and rejectPromise are function arguments', () => {
        const thenable: Thenable<void> = {
            then: jest.fn().mockImplementation((onFulfilled, onRejected) => {
                expect(typeof onFulfilled).toBe('function');
                expect(typeof onRejected).toBe('function');
                onFulfilled();
            })
        };
        it('via return from a fulfilled promise', (done) => {
            const promise = SyncPromise.resolve().then(() => thenable);
            promise.then(done);
        });
        it('via return from a rejected promise', (done) => {
            const promise = SyncPromise.reject('error').catch(() => thenable);
            promise.then(done);
        });
    });

    const other = { other: "other" };
    const thenables: ReadonlyArray<[string, (value: any, isFulfilled: boolean) => Thenable<any>]> = [
        ['a synchronously-resolved custom thenable', (value, isFulfilled) => ({
            then: (onFulfilled: any, onRejected: any) => isFulfilled ? onFulfilled(value) : onRejected(value)
        })], ['an asynchronously-resolved custom thenable', (value, isFulfilled) => ({
            then: (onFulfilled: any, onRejected: any) => setTimeout(() => isFulfilled? onFulfilled(value) : onRejected(value), 0) as any
        })], ['a synchronously-fulfilled one-time thenable', (value, isFulfilled) => {
            let numberOfTimesThenRetrieved = 0;
            return Object.create(null, {
                then: {
                    get: () => {
                        if (numberOfTimesThenRetrieved === 0) {
                            ++numberOfTimesThenRetrieved;
                            return (onFulfilled: any, onRejected: any) =>
                                isFulfilled ? onFulfilled(value) : onRejected(value)
                        }
                        return null;
                    }
                }
            });
        }], ['a thenable that tries to fulfill twice', (value, isFulfilled) => ({
            then: (onFulfilled: any, onRejected: any) => {
                if (isFulfilled) {
                    onFulfilled(value);
                    onFulfilled(other);
                } else {
                    onRejected(value);
                    onRejected(other);
                }
            }}) as Thenable<void>
        ], ['a thenable that fulfills but then throws', (value, isFulfilled) => ({
            then: (onFulfilled: any, onRejected: any) => {
                if (isFulfilled) {
                    onFulfilled(value);
                } else {
                    onRejected(value);
                }
                throw other;
            }} as Thenable<any>)
        ], [ 'an already-fulfilled promise', (value, isFulfilled) => new SyncPromise((resolve, reject) => isFulfilled ? resolve(value) : reject(value))
        ], ['an eventually-fulfilled promise', (value, isFulfilled) => new SyncPromise((resolve, reject) => setTimeout(() => resolve(value), 0))]
    ];
    const ys: ReadonlyArray<[string, any]> = [
        ['undefined'    , undefined],
        ['null'         , null],
        ['boolean'      , false],
        ['an error'     , new Error('failed')],
        ['an object'    , other],
        ['a number'     , 10],
        ['an array'     , [10, 1, 4]]
    ];

    describe("2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)", () => {
        const sentinel = 10;

        beforeEach(() => jest.useFakeTimers());

        it.each(ys)('y is %s, then calls resolvePromise synchronously, via return from a fulfilled promise', (_ , y) => {
            const thenable: Thenable<any> = {
                then: jest.fn().mockImplementation((resolvePromise) => resolvePromise(y))
            };
            const promise = SyncPromise.resolve().then(() => thenable);
            return expect(promise).resolves.toBe(y);
        });
        it.each(thenables)('y is %s, then calls resolvePromise synchronously, via return from a fulfilled promise', (tag, thenableBuilder) => {
            const thenable: Thenable<any> = thenableBuilder(sentinel, true);
            const promise = SyncPromise.resolve().then(() => thenable);
            jest.runAllTimers();
            return expect(promise).resolves.toBe(sentinel);
        });
        describe.each(thenables)('y is a thenable for thenable, outer is %s', (_ , outerThenableBuilder) => {
            it.each(thenables)('inner is %s, then calls resolvePromise synchronously, via return from a fulfilled promise', (_, innerThenableBuilder) => {
                const innerThenable: Thenable<any> = innerThenableBuilder(sentinel, true);
                const outerThenable: Thenable<any> = outerThenableBuilder(innerThenable, true);
                const promise = SyncPromise.resolve().then(() => outerThenable);
                jest.runAllTimers();
                return expect(promise).resolves.toBe(sentinel);
            });
        });
    });

    describe("2.3.3.3.2 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y)", () => {
        const reason = 'error';

        beforeEach(() => jest.useFakeTimers());

        it.each(ys)('y is %s, then calls rejectPromise synchronously, via return from a rejected promise', (_ , y) => {
            const thenable: Thenable<any> = {
                then: jest.fn().mockImplementation((_, rejectPromise) => rejectPromise(y))
            };
            const promise = SyncPromise.reject(y).then(() => thenable);
            return expect(promise).rejects.toBe(y);
        });
        it.each(thenables)('y is %s, then calls rejectPromise synchronously, via return from a rejected promise', (tag, thenableBuilder) => {
            const thenable: Thenable<any> = thenableBuilder(reason, true);
            const promise = SyncPromise.reject(reason).then(() => thenable);
            jest.runAllTimers();
            return expect(promise).rejects.toBe(reason);
        });
        describe.each(thenables)('y is a thenable for thenable, outer is %s', (_ , outerThenableBuilder) => {
            it.each(thenables)('inner is %s, then calls rejectPromise synchronously, via return from a rejected promise', (_, innerThenableBuilder) => {
                const innerThenable: Thenable<any> = innerThenableBuilder(reason, true);
                const outerThenable: Thenable<any> = outerThenableBuilder(innerThenable, true);
                const promise = SyncPromise.reject(reason).then(() => outerThenable);
                jest.runAllTimers();
                return expect(promise).rejects.toBe(reason);
            });
        });
    });

    describe('2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.', () => {
        const sentinel = 10;

        const fulfilledThenablesTests = [
            ['calling resolvePromise then rejectPromise, both synchronously', {
                then: (resolvePromise: any, rejectPromise: any) => {
                    resolvePromise(sentinel);
                    rejectPromise(other);
                }
            } as Thenable<any>],
            ['calling resolvePromise synchronously then rejectPromise asynchronously', {
                then: (resolvePromise: any, rejectPromise: any) => {
                    resolvePromise(sentinel);
                    setTimeout(() => rejectPromise(other), 0);
                }
            } as Thenable<any>],
            ['calling resolvePromise then rejectPromise, both asynchronously', {
                then: (resolvePromise: any, rejectPromise: any) => {
                    setTimeout(() => resolvePromise(sentinel), 0);
                    setTimeout(() => rejectPromise(other), 10);
                }
            } as Thenable<any>],
        ];

        beforeEach(() => jest.useFakeTimers());

        it.each(fulfilledThenablesTests)('%s, via return from a fulfilled promise', (_, thenable) => {
            const promise = SyncPromise.resolve().then(() => thenable);
            const onFulfilled = jest.fn().mockImplementation((value) => {
                expect(value).toBe(sentinel);
            });
            const onRejected = jest.fn();
            promise.then(onFulfilled, onRejected);
            jest.runAllTimers();
            expect(onRejected).not.toHaveBeenCalled();
            expect(onFulfilled).toHaveBeenCalledWith(sentinel);
            expect(onFulfilled).toHaveBeenCalledTimes(1);
            return expect(promise).resolves.toBe(sentinel);
        });
        it.each(fulfilledThenablesTests)('%s, via return from a rejected promise', (_, thenable) => {
            const promise = SyncPromise.reject('error').catch(() => thenable);
            const onFulfilled = jest.fn().mockImplementation((value) => {
                expect(value).toBe(sentinel);
            });
            const onRejected = jest.fn();
            promise.then(onFulfilled, onRejected);
            jest.runAllTimers();
            expect(onRejected).not.toHaveBeenCalled();
            expect(onFulfilled).toHaveBeenCalledWith(sentinel);
            expect(onFulfilled).toHaveBeenCalledTimes(1);
            return expect(promise).resolves.toBe(sentinel);
        });

        const rejectedThenableTests = [
            ['calling rejectPromise then resolvePromise, both synchronously', {
                then: (resolvePromise: any, rejectPromise: any) => {
                    rejectPromise(other);
                    resolvePromise(sentinel);
                }
            } as Thenable<any>],
            ['calling rejectPromise synchronously then resolvePromise asynchronously', {
                then: (resolvePromise: any, rejectPromise: any) => {
                    rejectPromise(other);
                    setTimeout(() => resolvePromise(sentinel), 0);
                }
            } as Thenable<any>],
            ['calling rejectPromise then resolvePromise, both asynchronously', {
                then: (resolvePromise: any, rejectPromise: any) => {
                    setTimeout(() => rejectPromise(other), 0);
                    setTimeout(() => resolvePromise(sentinel), 10);
                }
            } as Thenable<any>],
        ];

        it.each(rejectedThenableTests)('%s, via return from a fulfilled promise', (_, thenable) => {
            const promise = SyncPromise.resolve().then(() => thenable);
            const onFulfilled = jest.fn();
            const onRejected = jest.fn().mockImplementation((value) => {
                expect(value).toBe(other);
            });
            promise.then(onFulfilled, onRejected);
            jest.runAllTimers();
            expect(onRejected).toHaveBeenCalledWith(other);
            expect(onRejected).toHaveBeenCalledTimes(1);
            expect(onFulfilled).not.toHaveBeenCalled();
            return expect(promise).rejects.toBe(other);
        });
        it.each(rejectedThenableTests)('%s, via return from a rejected promise', (_, thenable) => {
            const promise = SyncPromise.reject('error').catch(() => thenable);
            const onFulfilled = jest.fn();
            const onRejected = jest.fn().mockImplementation((value) => {
                expect(value).toBe(other);
            });
            promise.then(onFulfilled, onRejected);
            jest.runAllTimers();
            expect(onRejected).toHaveBeenCalledWith(other);
            expect(onRejected).toHaveBeenCalledTimes(1);
            expect(onFulfilled).not.toHaveBeenCalled();
            return expect(promise).rejects.toBe(other);
        });
    });

    describe('2.3.3.3.4: If calling then throws an exception e', () => {
        describe('2.3.3.3.4.1: If resolvePromise or rejectPromise have been called, ignore it.', () => {
            const sentinel = 10;
            const sentinels: ReadonlyArray<[string, any]> = [
                ['a number'     , sentinel],
                ['an asynchronously-fulfilled promise', new SyncPromise(resolve => setTimeout(() => resolve(sentinel), 0))],
                ['a thenable'   , { then: (onRejected: any) => setTimeout(() => onRejected(sentinel), 0) }]
            ];

            beforeEach(() => jest.useFakeTimers());

            it.each(sentinels)('resolvePromise was called with %s', (_, value) => {
                const thenable = {
                    then: (resolvePromise: any) => {
                        resolvePromise(value);
                        throw other;
                    }
                };
                const promise = new SyncPromise((resolve) => setTimeout(() => resolve(thenable), 0));
                const promise2 = promise.then(value1 => expect(value1).toBe(sentinel));
                jest.runAllTimers();
                return promise2;
            });

            it.each(sentinels)('rejectPromise was called with %s', (_, value) => {
                const thenable = {
                    then: (resolvePromise: any, rejectPromise: any) => {
                        rejectPromise(value);
                        resolvePromise(other);
                        throw other;
                    }
                };
                const promise = new SyncPromise((resolve) => setTimeout(() => resolve(thenable), 0));
                jest.runAllTimers();
                return expect(promise).rejects.toBe(value);
            });
        });

        describe('2.3.3.3.4.2 Otherwise, reject promise with e as the reason.', () => {

            const error = new Error('error');
            const throwerThenable = {
                then: () => { throw error; }
            };

            it('via an asynchronously-resolved promise', () => {
                jest.useFakeTimers();
                const promise = new SyncPromise((resolve) => setTimeout(() => resolve(throwerThenable), 0));
                const onRejected = jest.fn().mockImplementation((error) => expect(error).toBe(error));
                const onFulfilled = jest.fn();
                const promise2 = promise.then(onFulfilled, onRejected);
                jest.runAllTimers();
                expect(onFulfilled).not.toHaveBeenCalled();
                expect(onRejected).toHaveBeenCalledWith(error);
                return promise2;
            });
        });
    });

    describe('2.3.3.4: If then is not a function, fulfill promise with x', () => {
        const nonThenables = [
            ['then is number', { then: 5 } ],
            ['then is object', { then: { then: 4 } } ],
            ['then is an object inheriting from Function.prototype', { then: Object.create(Function.prototype) } ],
            // tslint:disable-next-line:only-arrow-functions
            ['then is an array containing a function', { then: [function() {}] }]
        ];

        it.each(nonThenables)('%s', (_, nonThenable) => {
            const promise = SyncPromise.resolve().then(() => nonThenable);
            return expect(promise).resolves.toBe(nonThenable);
        });

        it.each(nonThenables)('%s', (_, nonThenable) => {
            const promise = SyncPromise.reject(nonThenable);
            return expect(promise).rejects.toBe(nonThenable);
        });
    })
});

describe('2.3.4: If x is not an object or function, fulfill promise with x', () => {
    const values: ReadonlyArray<[string, any]> = [
        ['undefined'    , undefined],
        ['number'       , 10],
        ['string'       , 'goodbye tests, I\'m done with this shitty job!'],
        ['boolean'      , true]
    ];
    it.each(values)('x is %s', (_, x) => {
        const promise = SyncPromise.resolve().then(() => x);
        return expect(promise).resolves.toBe(x);
    });
    it.each(values)('%s', (_, x) => {
        const promise = SyncPromise.reject(x);
        return expect(promise).rejects.toBe(x);
    });
});
