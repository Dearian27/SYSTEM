# Testing

## Commands

- `npm run test` runs the Vitest suite
- `npm run check` runs TypeScript typechecking

## Current scope

The first tests cover markdown session section behavior:

- `## Plan` insertion before `## Sessions`
- preserving neighboring sections while updating
- parsing `Plan` and `Sessions` independently

## Next useful tests

- `sessionStorage` behavior for file creation vs read-only access
- `SystemEngineView` interaction tests with mocked plugin host methods
