import "jest-extended";
import { SyncPromise } from "../promise";

// Permits access to private properties of SyncPromise.
// tslint:disable:no-string-literal no-empty

describe('SyncPromise <contructor>', () => {
    it('resolves like a promise, with the expected value', () => {
        return new SyncPromise<number>(resolve => {
            setTimeout(() => {
                resolve(1);
            }, 0);
        }).then((value) => {
            expect(value).toBe(1);
        });
    });

    it('resolves a thenable before calling then', () => {
        const internalPromise = new SyncPromise<number>(resolve1 => resolve1(30));
        return new SyncPromise<number>(resolve =>
            resolve(internalPromise)
        ).then((value) => expect(value).toBe(30));
    });

    it('catches errors (reject)', () => {
        const error = new Error('Simulate failure');
        return SyncPromise
            .reject(error)
            .catch(error => expect(error).toBe(error));
    });
    it('catches errors (throw)', () => {
        const error = new Error('Simulate failure');
        return new SyncPromise(() => {
            throw error;
        }).catch(error => expect(error).toBe(error));
    });

    it('is not mutable - "then" returns a new promise', () => {
        const start = SyncPromise.resolve<number>(20);
        return SyncPromise.all([
            start.then((val) => {
                    expect(val).toBe(20);
                    return 30;
                }).then((val) => expect(val).toBe(30)),
            // the start promise has not been modified by the previous computation.
            start.then((val) => expect(val).toBe(20)),
        ]);
    });
});

/**
 * Please refer to the Promises/A+ spec for the following tests: https://promisesaplus.com/
 * Note that our implementation is not always asynchronous (we implemented SyncPromise indeed!)
 * and also does not follow points 2.2.4, 2.2.5 and 3.5.
 */
describe('2.1.2: When fulfilled, a promise: ', () => {
    it('2.1.2.1 must not transition to any other state.', () => {
        const promise = SyncPromise.resolve<number>(12);
        expect(promise.getState()).toBe('FULFILLED');
        // Manually reject the promise
        promise['reject']();
        expect(promise.getState()).toBe('FULFILLED');
        return promise
    });

    it('2.1.2.2 must have a value, which must not change.', () => {
        const promise = SyncPromise.resolve<number>(12);
        expect(promise).resolves.toBe(12);
        promise['reject'](new Error('error'));
        return expect(promise).resolves.toBe(12);
    });
});

describe('2.1.3: When rejected, a promise: ', () => {
    it('2.1.3.1 must not transition to any other state.', () => {
        const promise = SyncPromise.reject(new Error('failed'));
        expect(promise.getState()).toBe('REJECTED');
        promise['resolve']();
        expect(promise.getState()).toBe('REJECTED');
    });

    it('2.1.3.2 must have a reason, which must not change.', () => {
        const error = "failed";
        const promise = SyncPromise.reject<string>(error);
        expect(promise).rejects.toBe(error);
        promise['resolve']();
        return expect(promise).rejects.toBe(error);
    });
});

describe('2.2.1 Both onFulfilled and onRejected are optional arguments:', () => {
    // Note that having typescript support assure that onFulfilled cannot be anything
    // other than a function or null, so it doesn't make sense to test against other types.

    describe('2.2.1.1 If onFulfilled is not a function, it must be ignored.', () => {
        it.each([
            ['undefined' , undefined],
            ['null'      , null]
        ])('applied to a directly-fulfilled promise passing onFulfilled of type %s ', (type, onFulfilled) => {
            const promise1 = SyncPromise.resolve(10);
            const promise2 = promise1.then(onFulfilled as any);
            expect(promise2).toBe(promise1);
            return SyncPromise.all([
                expect(promise1).resolves.toBe(promise2['value']),
                expect(promise2).resolves.toBe(10)
            ]);
        });
        it.each([
            ['undefined' , undefined],
            ['null'      , null]
        ])('applied to a directly-rejected promise, passing onFulfilled of type %s ', (type, onFulfilled) => {
            return SyncPromise
                .reject('failed')
                .then(
                    onFulfilled as any,
                    (error) => expect(error).toBe('failed')
                );
        });
        it.each([
            ['undefined' , undefined],
            ['null'      , null]
        ])('applied to a promise rejected and then chained off of, passing onFulfilled of type %s ', (type, onFulfilled) => {
            return SyncPromise
                .reject('failed')
                .then(() => { })
                .then(
                    onFulfilled as any,
                    (error) => expect(error).toBe('failed')
                );
        });
    });

    describe('2.2.1.2: If onRejected is not a function, it must be ignored.', () => {
        it.each([
            ['undefined' , undefined],
            ['null'      , null]
        ])('applied to a directly-rejected promise passing onRejected of type %s ', (type, onRejected) => {
            const promise1 = SyncPromise.reject('error');
            const promise2 = promise1.catch(onRejected as any);
            expect(promise2).toBe(promise1);
            return SyncPromise.all([
                expect(promise1).rejects.toBe(promise2['value']),
                expect(promise2).rejects.toBe('error')
            ]);
        });
        it.each([
            ['undefined' , undefined],
            ['null'      , null]
        ])('applied to a directly-fulfilled promise, passing onRejected of type %s ', (type, onRejected) => {
            return SyncPromise
                .resolve(10)
                .then(
                    (value) => expect(value).toBe(10),
                    onRejected as any,
                );
        });
        it.each([
            ['undefined' , undefined],
            ['null'      , null]
        ])('applied to a promise fulfilled and then chained off of, passing onRejected of type %s ', (type, onRejected) => {
            return SyncPromise
                .resolve(10)
                .catch(() => { })
                .then(
                    (value) => expect(value).toBe(10),
                    onRejected as any
                );
        });
    });
});

describe('2.2.2: If onFulfilled is a function: ', () => {
    it('2.2.2.1: it must be called after promise is fulfilled, with promise’s fulfillment value as its first argument', () => {
        const alreadyFulfilled = SyncPromise.resolve(10);
        alreadyFulfilled.then(value => {
            expect(alreadyFulfilled.getState()).toBe('FULFILLED');
            expect(value).toBe(10);
        });
        const eventuallyFulfilled = new SyncPromise((resolve) => setTimeout(() => resolve(10), 0));
        eventuallyFulfilled.then(value => {
            expect(alreadyFulfilled.getState()).toBe('FULFILLED');
            expect(value).toBe(10);
        });
        return SyncPromise.all([
            alreadyFulfilled,
            eventuallyFulfilled
        ]);
    });

    describe('2.2.2.2: it must not be called before `promise` is fulfilled', () => {
        it('fulfilled after a delay', () => {
            const eventuallyFulfilled = new SyncPromise(() => {});
            const onFulfilled = jest.fn();
            const promise2 = eventuallyFulfilled.then(onFulfilled);
            expect(eventuallyFulfilled.getState()).toBe('PENDING');
            expect(onFulfilled.mock.calls.length).toBe(0);
            setTimeout(() => {
                eventuallyFulfilled['resolve']();
                expect(onFulfilled.mock.calls.length).toBe(1);
            }, 0);
            return promise2;
        });

        it('never fulfilled', (done) => {
            const eventuallyFulfilled = new SyncPromise(() => {});
            const onFulfilled = jest.fn();
            eventuallyFulfilled.then(onFulfilled);
            expect(eventuallyFulfilled.getState()).toBe('PENDING');
            expect(onFulfilled.mock.calls.length).toBe(0);
            setTimeout(() => {
                expect(eventuallyFulfilled.getState()).toBe('PENDING');
                expect(onFulfilled.mock.calls.length).toBe(0);
                done();
            }, 0);
        });
    });

    describe('2.2.2.3 it must not be called more than once.', () => {
        it('already-fulfilled', () => {
            const onFulfilled = jest.fn();
            SyncPromise.resolve(10).then(onFulfilled);
            expect(onFulfilled.mock.calls.length).toBe(1);
        });
        it('trying to fulfill a pending promise more than once, immediately', () => {
            const onFulfilled = jest.fn();
            const promise = new SyncPromise(() => {});
            promise.then(onFulfilled);
            promise['resolve']();
            promise['resolve']();
            expect(onFulfilled.mock.calls.length).toBe(1);
        });
        it('trying to fulfill a pending promise more than once, delayed', (done) => {
            const onFulfilled = jest.fn();
            const promise = new SyncPromise(() => {});
            promise.then(onFulfilled);
            promise['resolve']();
            setTimeout(() => {
                promise['resolve']();
                expect(onFulfilled.mock.calls.length).toBe(1);
                done();
            });
        });
        it('when then is interleaved with fulfillment', () => {
            const onFulfilled1 = jest.fn();
            const onFulfilled2 = jest.fn();
            const promise = new SyncPromise(() => {});
            promise.then(onFulfilled1);
            promise['resolve']();
            promise.then(onFulfilled2);
            expect(onFulfilled1.mock.calls.length).toBe(1);
            expect(onFulfilled2.mock.calls.length).toBe(1);
        })
    });
});

describe('2.2.3: If onRejected is a function: ', () => {
    it('2.2.3.1: it must be called after promise is reject, with promise’s rejection value as its first argument', (done) => {
        const alreadyRejected = SyncPromise.reject('error');
        alreadyRejected.catch(error => {
            expect(alreadyRejected.getState()).toBe('REJECTED');
            expect(error).toBe('error');
        });
        const eventuallyRejected = new SyncPromise((_, reject) => setTimeout(() => reject('error'), 0));
        eventuallyRejected.catch(error => {
            expect(alreadyRejected.getState()).toBe('REJECTED');
            expect(error).toBe('error');
            done();
        });
    });

    describe('2.2.3.2: it must not be called before `promise` is reject', () => {
        it('reject after a delay', () => {
            const eventuallyRejected = new SyncPromise(() => {});
            const onRejected = jest.fn();
            const promise2 = eventuallyRejected.catch(onRejected);
            expect(eventuallyRejected.getState()).toBe('PENDING');
            expect(onRejected.mock.calls.length).toBe(0);
            setTimeout(() => {
                eventuallyRejected['reject']();
                expect(onRejected.mock.calls.length).toBe(1);
            }, 0);
            return promise2;
        });

        it('never reject', (done) => {
            const eventuallyRejected = new SyncPromise(() => {});
            const onRejected = jest.fn();
            eventuallyRejected.catch(onRejected);
            expect(eventuallyRejected.getState()).toBe('PENDING');
            expect(onRejected.mock.calls.length).toBe(0);
            setTimeout(() => {
                expect(eventuallyRejected.getState()).toBe('PENDING');
                expect(onRejected.mock.calls.length).toBe(0);
                done();
            }, 0);
        });
    });

    describe('2.2.3.3 it must not be called more than once.', () => {
        it('already-reject', () => {
            const onRejected = jest.fn();
            SyncPromise.reject('error').catch(onRejected);
            expect(onRejected.mock.calls.length).toBe(1);
        });
        it('trying to reject a pending promise more than once, immediately', () => {
            const onRejected = jest.fn();
            const promise = new SyncPromise(() => {});
            promise.catch(onRejected);
            promise['reject']();
            promise['reject']();
            expect(onRejected.mock.calls.length).toBe(1);
        });
        it('trying to reject a pending promise more than once, delayed', (done) => {
            const onRejected = jest.fn();
            const promise = new SyncPromise(() => {});
            promise.catch(onRejected);
            promise['reject']();
            setTimeout(() => {
                promise['reject']();
                expect(onRejected.mock.calls.length).toBe(1);
                done();
            });
        });
        it('when catch is interleaved with rejection', () => {
            const onRejected1 = jest.fn();
            const onRejected2 = jest.fn();
            const promise = new SyncPromise(() => {});
            promise.catch(onRejected1);
            promise['reject']();
            promise.catch(onRejected2);
            expect(onRejected1.mock.calls.length).toBe(1);
            expect(onRejected2.mock.calls.length).toBe(1);
        })
    });
});

describe('2.2.6: then may be called multiple times on the same promise.', () => {

    beforeEach(() => jest.useFakeTimers());

    it('2.2.6.1: If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then (even when one handler is added inside another handler).', () => {
        const promise = new SyncPromise(resolve => setTimeout(() => resolve(1), 100));
        const onFulfilled1 = jest.fn();
        const onFulfilled3 = jest.fn();
        const onFulfilled2 = jest.fn().mockImplementation(() =>
            promise.then(onFulfilled3)
        );
        promise.then(onFulfilled1);
        promise.then(onFulfilled2);
        expect(onFulfilled1).not.toBeCalled();
        expect(onFulfilled2).not.toBeCalled();
        expect(onFulfilled3).not.toBeCalled();
        jest.runAllTimers();
        expect(onFulfilled1).toBeCalledTimes(1);
        expect(onFulfilled2).toBeCalledTimes(1);
        expect(onFulfilled3).toBeCalledTimes(1);
        expect(onFulfilled1).toHaveBeenCalledBefore(onFulfilled2);
        expect(onFulfilled2).toHaveBeenCalledBefore(onFulfilled3);
    });

    it('2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then (even when one handler is added inside another handler)', () => {
        const promise = new SyncPromise((_ , reject) => setTimeout(() => reject('error'), 100));
        const onRejected1 = jest.fn();
        const onRejected3 = jest.fn();
        const onRejected2 = jest.fn().mockImplementation(() =>
            setTimeout(() => promise.catch(onRejected3), 10)
        );
        promise.catch(onRejected1);
        promise.catch(onRejected2);
        expect(onRejected1).not.toBeCalled();
        expect(onRejected2).not.toBeCalled();
        expect(onRejected3).not.toBeCalled();
        jest.runAllTimers();
        expect(onRejected1).toBeCalledTimes(1);
        expect(onRejected2).toBeCalledTimes(1);
        expect(onRejected3).toBeCalledTimes(1);
        expect(onRejected1).toHaveBeenCalledBefore(onRejected2);
        expect(onRejected2).toHaveBeenCalledBefore(onRejected3);
    });
});

describe('2.2.7 then must return a promise [i.e. promise2 = promise1.then(onFulfilled, onRejected)]', () => {
    it('is a promise', () => {
       const promise1 = SyncPromise.resolve(12);
       const promise2 = promise1.then((value) => value);
       expect(promise2).toEqual(expect.any(SyncPromise));
    });

    // '2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x)', see 3.3 tests.

    describe('2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.', () => {
        const reasons: ReadonlyArray<any> = [
            ['undefined', undefined],
            ['null', null],
            ['boolean', false],
            ['an error', new Error('failed')],
            ['an always pending thenable', { then: () => {} }],
            ['a fulfilled promise', SyncPromise.resolve(10)],
            ['a rejected promise', SyncPromise.reject('error')]
        ];
        it.each(reasons)('applied to a fulfilled promise1, onFulfilled throwing %s', (name, reason) => {
            const promise2 = SyncPromise.resolve(10).then(() => {
                throw reason;
            });
            return expect(promise2).rejects.toBe(reason);
        });
        it.each(reasons)('applied to a rejected promise1, onFulfilled throwing %s', (name, reason) => {
            const promise2 = SyncPromise.reject(null).catch(() => {
                throw reason;
            });
            return expect(promise2).rejects.toBe(reason);
        });
        it.each(reasons)('applied to an eventually-fulfilled promise1, onFulfilled throwing %s', (name, reason) => {
            jest.useFakeTimers();
            const promise2 = new SyncPromise(resolve => setTimeout(() => resolve(10), 100)).then(() => {
                throw reason;
            });
            jest.runAllTimers();
            return expect(promise2).rejects.toBe(reason);
        });
        it.each(reasons)('applied to an eventually-rejected promise1, onFulfilled throwing %s', (name, reason) => {
            jest.useFakeTimers();
            const promise2 = new SyncPromise((_ , reject) => setTimeout(() => reject(), 100)).catch(() => {
                throw reason;
            });
            jest.runAllTimers();
            return expect(promise2).rejects.toBe(reason);
        });
    });

    describe('2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1', () => {
        it('applied to a fulfilled promise', () => {
            const promise1 = SyncPromise.resolve(10);
            const promise2 = promise1.then(undefined);
            expect(promise2.getState()).toBe('FULFILLED');
            return expect(promise2).resolves.toBe(10);
        });
        it('applied to an eventually-fulfilled promise', () => {
            jest.useFakeTimers();
            const promise1 = new SyncPromise((resolve) => {
                setTimeout(() => resolve(10), 10);
            });
            const promise2 = promise1.then(undefined);
            jest.runAllTimers();
            expect(promise2.getState()).toBe('FULFILLED');
            return expect(promise2).resolves.toBe(10);
        });
    });

    describe('2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason as promise1', () => {
        it('applied to a rejected promise', () => {
            const promise1 = SyncPromise.reject('error');
            const promise2 = promise1.then();
            expect(promise2.getState()).toBe('REJECTED');
            return expect(promise2).rejects.toBe('error');
        });
        it('applied to an eventually-rejected promise', () => {
            jest.useFakeTimers();
            const promise1 = new SyncPromise((_ , reject) => {
                setTimeout(() => reject('error'), 10);
            });
            const promise2 = promise1.then();
            jest.runAllTimers();
            expect(promise2.getState()).toBe('REJECTED');
            return expect(promise2).rejects.toBe('error');
        });
    });
});

