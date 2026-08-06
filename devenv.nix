{ pkgs, lib, ... }:

{
  packages = with pkgs; [
    nodejs_24
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

  processes = {
    infra.exec = "docker compose -f docker-compose.dev.yml up";
    backend.exec = "docker compose -f docker-compose.dev.yml up --wait && npx nx serve backend";
    frontend.exec = "npx nx serve frontend";
  };

  scripts.migrate.exec = "npm run typeorm:migrate";
  scripts.migrate-revert.exec = "npm run typeorm:migrate:revert";

  enterShell = ''
    echo "SWUniverse Dev Environment (devenv)"
    echo "  node: $(node --version)"
    echo ""
    echo "Commands:"
    echo "  devenv up        - Start docker infra, backend, frontend"
    echo "  migrate          - Run TypeORM migrations"
    echo "  migrate-revert   - Revert last migration"
    echo ""
    echo "Services (Docker):"
    echo "  Postgres: 127.0.0.1:5490 (user: swuniverse)"
    echo "  Redis:    127.0.0.1:6379"
    echo ""
    echo "Apps (nx serve):"
    echo "  Backend:  http://localhost:3001"
    echo "  Frontend: http://localhost:5173"
    echo ""
  '';
}
