# sync-promise
A synchronous implementation of the promises/A+ standard

## Notes
* This implementation follows the specification apart from point 2.2.5, 2.2.4 and note 3.1. Given the synchronicity proposal of the implementation it would have been impossible to call onFulfilled and onRejected with an empty execution stack. For more information, please refer to: https://promisesaplus.com/.

* The implementation has been widely tested (100% test coverage) and is fully interoperable with all correct Thenables (as stated in the spec.).

