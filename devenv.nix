{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/basics/
  env.GREET = "Star Wars Universe Dev Environment";

  # https://devenv.sh/packages/
  packages = [ 
    pkgs.git
    pkgs.nodejs_20
  ];

  # https://devenv.sh/languages/
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
    npm.enable = true;
  };

  languages.typescript.enable = true;

  # https://devenv.sh/processes/
  processes = {
    backend.exec = "cd backend && npm run dev";
    frontend.exec = "cd frontend && NODE_OPTIONS='--max-old-space-size=4096' npm run dev";
  };

  # https://devenv.sh/services/
  services.postgres = {
    enable = true;
    package = pkgs.postgresql_15;
    initialDatabases = [
      { name = "swu_game"; }
    ];
    listen_addresses = "127.0.0.1";
    port = 5432;
    initialScript = ''
      CREATE USER postgres WITH PASSWORD 'postgres' SUPERUSER;
    '';
  };

  services.redis = {
    enable = true;
    port = 6379;
  };

  # https://devenv.sh/scripts/
  scripts.setup.exec = ''
    echo "Setting up Star Wars Universe development environment..."
    cd backend
    cp .env.example .env 2>/dev/null || true
    npm install
    npx prisma generate
    npx prisma migrate dev --name init
    echo "Note: Use 'reset-db' script for seeding (backend/scripts/reset-and-seed.ts)"
    echo "Initializing galaxy and start planets..."
    curl -X POST http://localhost:3000/api/galaxy/initialize 2>/dev/null || echo "Note: Galaxy initialization requires backend to be running"
    cd ../frontend
    npm install
    echo ""
    echo "✨ Setup complete! Run 'devenv up' to start all services."
    echo "After services start, run: curl -X POST http://localhost:3000/api/galaxy/initialize"
  '';

  scripts.init-galaxy.exec = ''
    echo "Initializing galaxy and start planets..."
    curl -X POST http://localhost:3000/api/galaxy/initialize
  '';

  scripts.migrate.exec = ''
    cd backend
    npx prisma migrate dev
  '';

  scripts.studio.exec = ''
    cd backend
    npx prisma studio
  '';

  scripts.reset-db.exec = ''
    cd backend
    npx tsx scripts/reset-and-seed.ts
  '';

  enterShell = ''
    echo "🚀 $GREET"
    echo ""
    echo "Available commands:"
    echo "  devenv up        - Start all services (backend, frontend, postgres, redis)"
    echo "  setup            - Initial setup (install deps, migrate, seed)"
    echo "  migrate          - Run database migrations"
    echo "  studio           - Open Prisma Studio"
    echo "  reset-db         - Reset & seed DB (factions, buildings, research, ships, galaxy)"
    echo ""
    echo "Services:"
    echo "  PostgreSQL:      localhost:5432 (user: postgres, pass: postgres, db: swu_game)"
    echo "  Redis:           localhost:6379"
    echo "  Backend API:     http://localhost:3000"
    echo "  Frontend:        http://localhost:5173"
    echo ""
    echo "Features:"
    echo "  ✅ 8 Resource Types (Credits, Durastahl, Kristall, Energie, etc.)"
    echo "  ✅ 36 Research Technologies (4 levels, 4 categories)"
    echo "  ✅ 14 Ship Types (TIE Fighter to Mon Calamari Cruiser)"
    echo "  ✅ Building System (11 types, energy management)"
    echo "  ✅ Galaxy Map (50x50 sectors, multi-level navigation)"
    echo "  ✅ Real-time Updates (Socket.io for buildings, research, ships)"
    echo ""
  '';

  # https://devenv.sh/pre-commit-hooks/
  # pre-commit.hooks.shellcheck.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
