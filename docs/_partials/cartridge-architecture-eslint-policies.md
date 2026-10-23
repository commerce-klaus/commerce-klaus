<!-- markdownlint-disable-file MD041 -->

| Architecture              | ESLint policy rules                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storefront-next`         | `no-controllers`, `no-forms`, `no-storefront-isml-rendering`, `no-pipeline-api`, `no-proprietary-module-syntax` (`*/` only), `no-sfra-server`, `prefer-tilde-require-path` |
| `pwa`                     | `no-controllers`, `no-forms`, `no-storefront-isml-rendering`, `no-pipeline-api`, `no-proprietary-module-syntax` (`*/` only), `no-sfra-server`, `prefer-tilde-require-path` |
| `sfra`                    | `no-pipeline-api`                                                                                                                                                          |
| `sitegenesis-controllers` | `no-pipeline-api`, `no-sfra-server`                                                                                                                                        |
| `sitegenesis-pipelines`   | `no-sfra-server`                                                                                                                                                           |

`pwa` and `storefront-next` currently enforce the same headless boundaries. They retain separate
semantic names so their policies can evolve independently as their platform contracts diverge.

Both headless policies reject `*/` lookup, require `~/` for modules in the current cartridge, and
use named paths for explicit cross-cartridge dependencies. They continue to allow
`module.superModule`.

`sitegenesis-pipelines` is the only policy that permits access to `dw/system/Pipeline`. The ESLint
preset applies to JavaScript; it does not validate pipeline XML files.
