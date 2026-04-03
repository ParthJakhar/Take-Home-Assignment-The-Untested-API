# Bug Report: Pagination Off-by-One

## Expected behavior
`GET /tasks?page=1&limit=10` should return the first 10 tasks (offset `0`).

## What actually happens
`GET /tasks?page=1&limit=10` returns tasks starting from index `10` (the “second page”).

## How I discovered it
The failures came from:
- Unit test: `tests/taskService.test.js` for `getPaginated(1, 10)`
- Integration test: `tests/tasks.routes.test.js` for `GET /tasks?page=1&limit=10`

## Root cause
`src/services/taskService.js` computed pagination offset as `page * limit`, which effectively treats `page` as 0-based, while the API uses 1-based page numbers.

## What the fix looks like
Change the offset to `(page - 1) * limit` (and clamp `page` to at least `1`).

