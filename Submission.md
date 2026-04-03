# Submission Note

## Coverage / verification
- Test suite: `npm test` (all passing)
- Coverage: `npm run coverage` (overall statement coverage ~93% and branch coverage ~85%)
```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   93.67 |    85.55 |   93.33 |   93.05 |
 src             |   69.23 |       75 |       0 |   69.23 |
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes      |     100 |    91.66 |     100 |     100 |
  tasks.js       |     100 |    91.66 |     100 |     100 | 20-21
 src/services    |     100 |     90.9 |     100 |     100 |
  taskService.js |     100 |     90.9 |     100 |     100 | 12-23
 src/utils       |   79.31 |       80 |     100 |   79.31 |
  validators.js  |   79.31 |       80 |     100 |   79.31 | 9,12,22,25,31,38
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 2 passed, 2 total
Tests:       28 passed, 28 total
Snapshots:   0 total


## What I’d test next (if I had more time)
- Validation of query parameters (`page`, `limit`, `status`) for invalid/non-numeric values
- Status filtering behavior when `status` doesn’t exactly match an allowed value
- Edge cases around overdue boundaries (e.g., `dueDate` exactly equal to `now`)
- Concurrency/race conditions (not relevant for the in-memory store, but relevant for production)

## Anything that surprised me
- The pagination implementation used an off-by-one offset internally (0-based), while the API contract uses 1-based page numbers.

## Questions before shipping to production
- Should `GET /tasks?status=...` require exact matches only, and should invalid values return `400`?
- Should `PATCH /tasks/:id/assign` allow overwriting an existing assignee, or should it reject changes once assigned?

