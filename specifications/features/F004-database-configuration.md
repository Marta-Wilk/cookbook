# F004 — Database Configuration

## Goal

The application automatically selects its database at startup with no manual
configuration required for the default (H2) path. When a PostgreSQL connection string
is supplied and the server is reachable, PostgreSQL is used. Otherwise the application
falls back to a file-based H2 database so that data is preserved across restarts without
requiring any external infrastructure.

## Acceptance criteria

1. When the `POSTGRES_URL` environment variable is **not set**, the application starts
   and uses H2 file-based storage; the startup log contains `"Database: H2 file-based"`
2. When `POSTGRES_URL` is set **and** PostgreSQL is reachable, the application uses
   PostgreSQL; the startup log contains `"Database: PostgreSQL"`
3. When `POSTGRES_URL` is set but the connection times out (within ≤ 3 seconds), the
   application logs a warning and starts with H2 file-based — no exception is thrown
   and the application does not fail to start
4. H2 file-based data is stored at `cookbookdb.mv.db` in the project root (JDBC URL:
   `jdbc:h2:file:../cookbookdb` relative to the `backend/` directory); all persisted
   data (recipes, meal plans, shopping lists) survives an application restart
5. All JPA entities and repositories behave identically on both databases; the schema is
   managed by `ddl-auto: update` on both
6. All `@DataJpaTest` and `@SpringBootTest` tests use H2 in-memory; they never read or
   write the file-based database or PostgreSQL, regardless of what environment variables
   are set in the developer's environment

## Configuration reference

| Environment variable | Purpose                  | Default        |
|----------------------|--------------------------|----------------|
| `POSTGRES_URL`       | PostgreSQL JDBC URL      | (unset → H2)   |
| `POSTGRES_USER`      | PostgreSQL username      | `postgres`     |
| `POSTGRES_PASSWORD`  | PostgreSQL password      | (empty string) |

Example for local PostgreSQL:
```
POSTGRES_URL=jdbc:postgresql://localhost:5432/cookbook
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
```

## Implementation notes

- The datasource selection logic lives in `com.cookbook.config.DataSourceConfig`
- It attempts a real JDBC `getConnection()` call with a 3-second timeout before deciding
- `HikariCP` is used for both datasource paths (already on the classpath)
- Hibernate dialect is auto-detected from the JDBC URL — no explicit dialect setting needed
- Test isolation is enforced via `src/test/resources/application.yml`, which overrides
  the `app.datasource.postgres.url` to empty and the H2 URL to in-memory

## Holdout tests (CI gate)

- `mvn verify` passes with no `POSTGRES_URL` set (CI environment has no PostgreSQL)
- A `@SpringBootTest` save + find round-trip for a `Recipe` entity succeeds without
  PostgreSQL available
- After the test run, no new `.mv.db` file is created in the project root
  (confirms tests used in-memory H2, not the file-based database)
