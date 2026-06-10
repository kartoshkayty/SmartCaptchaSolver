{
  description = "Dev shell with nix-ld";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # твои инструменты
            gcc
            cmake
            pkg-config
            playwright-driver.browsers
            chromium
            firefox
            jq
            curl
            rsync
          ];

          # nix-ld: позволяет запускать динамически слинкованные бинари
          NIX_LD = pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker";
          NIX_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath (with pkgs; [
            stdenv.cc.cc.lib
            zlib
            openssl
            gtk3
            alsa-lib
            xorg.libX11
            # добавляй сюда нужные .so
          ]);

          shellHook = ''
            export LD_LIBRARY_PATH=$NIX_LD_LIBRARY_PATH
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu-24.04"
            export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=${pkgs.playwright-driver.browsers}/chromium-1217/chrome-linux64/chrome
          '';
        };
      }
    );
}