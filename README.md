# Austerity

A client-side web application for a popular deck-building board game, built with vanilla JavaScript and JSDoc annotations.

## Architecture

This project uses:
- **Vanilla JavaScript** with JSDoc type annotations, so no build step
- **TypeScript compiler** for type checking (no .ts files)
- **Firebase Realtime Database** for real-time game synchronization
- **Local game engine** running in each browser
- **Event sourcing** for game state reconstruction

## Development

Install node.js 18+ (for development tooling and testing)

1. `git clone` this repository
2. `npm install` to install development dependencies
3. `npm test` to lint then execute the Jasmine test suite.
4. `npm pretest` to just lint
5. `npm run profile` - Runs tests with Node.js profiling
6. `npm run cover` - Runs tests with code coverage

## History

This project was originally a Node.js web server with WebSockets (see [v0.1](https://github.com/darthwalsh/Austerity/tree/v0.1)), but had no error-recovery and so it wasn't fun to run on free webapp hosting and get kicked out...
