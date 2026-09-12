<!-- markdownlint-disable-file MD041 -->

Commerce Klaus uses the following precedence when determining cartridge order:

1. An explicit `cartridgePath` option.
2. An `envCartridgePath` option or the `SFCC_CARTRIDGE_PATH` environment variable.
3. References in the configured solution `jsconfig.json`.
4. The site's `custom-cartridges` value in `site.xml`.
5. A deterministic alphabetical filesystem fallback.

The first source that produces entries wins. Missing cartridge directories are filtered out, and valid results are represented internally as absolute cartridge-root paths.

For reproducible CI and local behavior, prefer an authoritative project source such as an explicit path, solution references, or site metadata. The alphabetical fallback is convenient for initial setup, but it cannot express intentional override precedence.
