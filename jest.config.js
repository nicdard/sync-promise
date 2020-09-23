module.exports = {
    preset: 'ts-jest',

    // Automatically clear mock calls and instances between every test
    clearMocks: true,
    /*
    Default: The root of the directory containing your Jest config file or
    the package.json or the pwd if no package.json is found.
     */
    roots: ['src'],
    /*
    Indicates whether each individual test should be reported during the run.
    All errors will also still be shown on the bottom after execution.
     */
    verbose: true,
    /*
    The directory where Jest should output its coverage files.
     */
    coverageDirectory: 'coverage',
    // An array of regexp pattern strings used to skip coverage collection
    coveragePathIgnorePatterns: [
        "/node_modules/"
    ],
    // An array of file extensions your modules use
    moduleFileExtensions: [
        "js",
        // "json",
        // "jsx",
        "ts",
        "tsx",
        // "node"
    ],
    // The glob patterns Jest uses to detect test files
    testMatch: [
        "**/__tests__/**/*.test.ts?(x)"
        // "**/?(*.)+(spec|test).[tj]s?(x)"
    ],

    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    testPathIgnorePatterns: [
        "/node_modules/"
    ],

    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json'
        }
    }
};