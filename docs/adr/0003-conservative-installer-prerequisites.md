# Conservative installer prerequisites

The bootstrap installer automates user-level dependency setup and pi-web-toolkit configuration, but it does not silently install or alter system-level prerequisites such as Node.js, Pi, Docker, Homebrew, or OS package-manager state. It asks before optional setup steps such as a local Docker SearXNG container and otherwise reports precise remediation commands, preserving user control over system-wide changes while still making the common path easier.
