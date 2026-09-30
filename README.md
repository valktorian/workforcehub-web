# WorkForceHubWeb

**Live app:** https://valktorian.github.io/workforcehub-web/

## Demo account

| Email | Password | Role |
|---|---|---|
| `HrViewer@workforcehub.com` | `Test1234` | HRViewer |

The HRViewer role can browse and manage employees, schedules, leave and career records, but cannot manage login accounts.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
npm start
```

This serves the `local` configuration, which reads the API URL from `src/environments/environment.local.ts`. Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Deployment

Every push to `main` builds the app and deploys it to GitHub Pages through the [Deploy to GitHub Pages](.github/workflows/deploy.yml) workflow. The production API URL is set in `src/environments/environment.ts`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
