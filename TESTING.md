# Testing Guide

## Overview

This project includes unit tests, integration tests, and E2E tests to ensure code quality and prevent regressions.

## Running Tests

### Backend Tests

```bash
cd backend

# Run once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

Test files: `src/**/__tests__/*.test.js`

### Frontend Tests

```bash
cd frontend

# Run once with UI
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

Test files: `src/**/__tests__/*.test.jsx`

### E2E Tests

```bash
cd frontend

# Open Cypress UI (interactive testing)
npm run e2e

# Run headless (CI/CD)
npm run e2e:ci
```

Test files: `cypress/e2e/**/*.cy.js`

## Writing Tests

### Backend Unit Test Example

```javascript
// src/controllers/__tests__/auth.test.js
const request = require('supertest');
const app = require('../../index');

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });
  });
});
```

### Frontend Component Test Example

```javascript
// src/components/__tests__/Navbar.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';

describe('Navbar Component', () => {
  it('displays contributor link', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('Contributors')).toBeInTheDocument();
  });

  it('navigates to contributors on click', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    screen.getByText('Contributors').click();
    // Add navigation assertion
  });
});
```

### E2E Test Example

```javascript
// cypress/e2e/auth.cy.js
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/auth');
  });

  it('should display register form', () => {
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('should register user successfully', () => {
    cy.get('input[type="email"]').type('newuser@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/auth/verify');
  });
});
```

## Test Coverage

### Targets

- Backend: > 80% line coverage
- Frontend: > 70% line coverage

### Generate Coverage Report

```bash
# Backend
cd backend
npm run test:coverage
open coverage/lcov-report/index.html

# Frontend
cd frontend
npm run test:coverage
open coverage/index.html
```

### View Coverage

Coverage reports are generated in:
- Backend: `backend/coverage/`
- Frontend: `frontend/coverage/`

Open `index.html` in a browser for interactive view.

## CI/CD Integration

Tests run automatically on:
- Every push to `main` and `develop` branches
- Every pull request
- Scheduled daily (midnight UTC)

### GitHub Actions Workflows

- `.github/workflows/backend-tests.yml` — Backend testing
- `.github/workflows/frontend-tests.yml` — Frontend testing

## Testing Best Practices

### ✓ Do

- Test happy paths (user succeeds)
- Test error cases (validation fails, network error)
- Test edge cases (empty input, max length, special characters)
- Keep tests focused (one assertion per test when possible)
- Use descriptive test names
- Mock external services (API calls, databases)

### ✗ Don't

- Test implementation details (internal functions)
- Test framework behavior (Vue, React internals)
- Create interdependent tests (test A must run before B)
- Use real APIs/databases in tests (use mocks)
- Sleep/wait unnecessarily (use cy.intercept, await promises)

## Running Tests in CI/CD

### Locally before pushing

```bash
# Backend
cd backend && npm test && npm run test:coverage

# Frontend
cd frontend && npm test -- --run && npm run test:coverage

# E2E
npm run e2e:ci
```

### GitHub Actions

Tests run automatically. Check status:
```bash
# View recent runs
gh run list

# View specific run
gh run view <run-id>

# View logs for failing job
gh run view <run-id> --log
```

## Debugging Tests

### Backend

```bash
# Run single test file
npm test -- src/controllers/__tests__/auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should register"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend

```bash
# Run single test
npm test -- Navbar.test.jsx

# Watch mode (re-run on changes)
npm test -- --watch

# UI mode for visual debugging
npm run test:ui
```

### E2E

```bash
# Run single spec
npx cypress run --spec="cypress/e2e/auth.cy.js"

# Debug mode (opens developer tools)
npx cypress open

# Slow down execution for debugging
npx cypress run --slow-mo 1000
```

## Performance Testing

### Load Testing

```bash
# Backend load test (requires loadtest)
npm install -g loadtest

loadtest -n 1000 -c 10 http://localhost:4000/api/health
```

### Frontend Performance

Use Chrome DevTools Performance tab or:

```javascript
// Add to component
useEffect(() => {
  const start = performance.now();
  // component logic
  const end = performance.now();
  console.log(`Render time: ${end - start}ms`);
}, []);
```

## Troubleshooting

### Test Failures

**Backend tests fail with "database locked":**
```bash
# Kill any blocking connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'test_db';"

# Or reset database
npm run db:push
```

**Frontend tests fail with "Cannot find module":**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm test
```

**E2E tests timeout:**
```bash
# Increase timeout in cypress.config.js
defaultCommandTimeout: 10000

# Or in test
cy.visit('...', { timeout: 10000 })
```

### Viewing Test Results

```bash
# Backend results
npm test -- --verbose

# Frontend results (HTML report)
npm test -- --reporter=html
open coverage/index.html

# E2E results (video)
npx cypress run --video
open cypress/videos/
```
