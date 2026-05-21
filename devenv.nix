{ pkgs, lib, ... }:

{
  packages = with pkgs; [
    nodejs_22
    docker-compose
    jq
    git
  ];

  dotenv.enable = true;

  env = {
    DATABASE_URL = "postgresql://swuniverse:devpassword@127.0.0.1:5490/swuniverse";
    REDIS_URL = "redis://127.0.0.1:6379";
    JWT_SECRET = "dev-jwt-secret-change-in-prod";
    GAME_DATA_PATH = "./game-data/data";
    NODE_ENV = "development";
    TYPEORM_SYNCHRONIZE = "false";
  };

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    port = 5490;
    initialDatabases = [ { name = "swuniverse"; } ];
    initialScript = ''
      CREATE USER swuniverse WITH PASSWORD 'devpassword' SUPERUSER;
      GRANT ALL PRIVILEGES ON DATABASE swuniverse TO swuniverse;
    '';
    listen_addresses = "127.0.0.1";
  };

  services.redis = {
    enable = true;
    port = 6379;
  };

  processes = {
    # devenv's generated Postgres readiness probe uses pg_isready without
    # explicit host/port. On this project Postgres runs on 127.0.0.1:5490,
    # so make the probe explicit to avoid false "Not Ready" health state.
    postgres.ready.exec = lib.mkForce ''
      PGHOST=127.0.0.1 PGPORT=5490 ${pkgs.postgresql_16}/bin/pg_isready -d template1 && \
      PGHOST=127.0.0.1 PGPORT=5490 ${pkgs.postgresql_16}/bin/psql -c "SELECT 1" template1 > /dev/null 2>&1
    '';

    backend.exec = "npx nx serve backend";
    frontend.exec = "npx nx serve frontend";
  };

  scripts.migrate.exec = "npm run typeorm:migrate";
  scripts.migrate-revert.exec = "npm run typeorm:migrate:revert";

  enterShell = ''
    echo "SWUniverse Dev Environment (devenv)"
    echo "  node: $(node --version)"
    echo ""
    echo "Commands:"
    echo "  devenv up        - Start postgres, redis, backend, frontend"
    echo "  migrate          - Run TypeORM migrations"
    echo "  migrate-revert   - Revert last migration"
    echo ""
    echo "Services:"
    echo "  Postgres: 127.0.0.1:5490 (user: swuniverse)"
    echo "  Redis:    127.0.0.1:6379"
    echo "  Backend:  http://localhost:3001"
    echo "  Frontend: http://localhost:5173"
    echo ""
  '';
}
