import { SyncPromise, Thenable } from "../promise";
import "jest-extended";

// tslint:disable:no-empty

const error1 = new Error('error1');
const error2 = new Error('error2');
const syncRejectedThenable = SyncPromise.reject(error1);
const asyncRejectedThenable = new SyncPromise((_, reject) => setTimeout(() => reject(error2), 10));

const values = [false, 1, 'hello', undefined];
const fulfilled = [
    values[0],
    SyncPromise.resolve(values[1]),
    SyncPromise.resolve(values[2]),
    new SyncPromise((resolve) => setTimeout(() => resolve(values[3] as undefined), 0))
] as [boolean, Thenable<number>, Thenable<string>, Thenable<undefined>];

describe('all combinator', () => {
    beforeEach(() => jest.useFakeTimers());

    it('is fulfilled only after all thenables are fulfilled, with the fulfillment value an array (in order) of fulfillment values', () => {
        const all = SyncPromise.all(fulfilled);
        const onFulfilled = jest.fn((array) => {
            expect(array).toBeArrayOfSize(4);
        });
        all.then(onFulfilled);
        expect(onFulfilled).toHaveBeenCalledTimes(0);
        jest.runAllTimers();
        return expect(all).resolves.toEqual(values);
    });

    it('is rejected if (and when) any of the thenables is rejected, with the first rejection value as the rejection value', () => {
        const all = SyncPromise.all([...fulfilled, syncRejectedThenable] as any);
        const onFulfilled = jest.fn();
        const onRejected = jest.fn();
        all.then(onFulfilled, onRejected);
        expect(onFulfilled).toHaveBeenCalledTimes(0);
        // Tests that the promise is immediately rejected when an error occurs, even if
        // some thenable arguments have still not been executed.
        expect(onRejected).toHaveBeenCalledTimes(1);
        jest.runAllTimers();
        return expect(all).rejects.toEqual(error1);
    });

    it.each([
        ['[synchronous, asynchronous]', syncRejectedThenable, asyncRejectedThenable],
        ['[asynchronous, synchronous]', asyncRejectedThenable, syncRejectedThenable]
    ])('has, when rejected, the first rejection value as the rejection value, try passing %s', (_, p1, p2) => {
        const all = SyncPromise.all([p1, p2]);
        const onFulfilled = jest.fn();
        const onRejected = jest.fn();
        all.then(onFulfilled, onRejected);
        expect(onFulfilled).toHaveBeenCalledTimes(0);
        // Tests that the promise is immediately rejected when an error occurs, even if
        // some thenable arguments have still not been executed.
        expect(onRejected).toHaveBeenCalledTimes(1);
        jest.runAllTimers();
        return expect(all).rejects.toEqual(error1);
    });
});

describe('race combinator', () => {
    describe('is fulfilled as soon as any item fulfills', () => {
        beforeEach(() => jest.useFakeTimers());

        it('fulfills immediately when the first item is not a thenable, with the item as the fulfillment value', () => {
            const race = SyncPromise.race(fulfilled as any);
            jest.runAllTimers();
            return expect(race).resolves.toBe(values[0]);
        });
        it('fulfills synchronously with the value of the first synchronous thenable in the items array, even if the first item is an asynchronous thenable', () => {
           const race = SyncPromise.race([new SyncPromise((_, reject) => { setTimeout(() => reject('error'), 0); }), ...fulfilled] as any);
           jest.runAllTimers();
           return expect(race).resolves.toBe(values[0]);
        });
        it('fulfills even if an item is a forever-pending thenable', () => {
            const race = SyncPromise.race([new SyncPromise(() => {}), ...fulfilled] as any);
            jest.runAllTimers();
            return expect(race).resolves.toBe(values[0]);
        });
    });

    describe('is rejected as soon as any item rejects', () => {
        beforeEach(() => jest.useFakeTimers());

        it('rejects synchronously with the value of the first synchronous thenable in the items array, even if the first item is an asynchronous thenable', () => {
            const race = SyncPromise.race([new SyncPromise((_, reject) => { setTimeout(() => reject('error'), 0); }), syncRejectedThenable, ...fulfilled] as any);
            jest.runAllTimers();
            return expect(race).rejects.toBe(error1);
        });
        it('rejects even if an item is a forever-pending thenable', () => {
            const race = SyncPromise.race([new SyncPromise(() => {}), asyncRejectedThenable] as any);
            jest.runAllTimers();
            return expect(race).rejects.toBe(error2);
        });
    });
});