# sync-promise
A synchronous implementation of the Promises/A+ standard

## Notes
This implementation:
* strictly follows the specifications except for the following points: 2.2.5, 2.2.4 and note 3.1.
* is voluntarily synchronous, but due to its nature it is not possible to call onFulfilled and onRejected with an empty execution stack. For more information, see: https://promisesaplus.com/.

* has been extensively tested (100% test coverage) and is fully interoperable with all the correct Thenables (as specified in the specifications).

