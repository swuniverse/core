{
  description = "SWUniverse development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            docker-compose
            postgresql_16
            redis
            caddy
            jq
            git
          ];

          shellHook = ''
            echo "🚀 SWUniverse Dev Environment"
            echo "  node: $(node --version)"
            echo "  npm:  $(npm --version)"
            echo ""
            echo "Commands:"
            echo "  npm run dev       — Start backend + frontend"
            echo "  docker compose up — Start DB + Redis"
            echo ""
          '';
        };
      }
    );
}
