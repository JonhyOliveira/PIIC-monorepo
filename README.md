# 💫 PIIC-monorepo
Monorepo para o trabalho desenvolvido no âmbito do Programa de Introdução à Investigação Ciêntifica da FCT, na Unidade Curricular de _Atividade de Desenvolvimento Curricular_.

Neste monorepo estão todos os artefactos relevantes que foram produzidos no decorrer do trabalho, ao longo do 2º semestre do periodo letivo de 2022.

This monorepo includes all relevant artifacts of the work done under FCT's _Programa de Introdução à Investicação_ for the curricular unit of _Atividade de Desenvolvimento Curricular_.

This work was done during the 2<sup>nd</sup> semester of 2021/22.

## Directories / Modules

- **TejoSynchronizer** is one of the most important artifacts. It's a framework which defines interfaces for the 3 components that were identified as the most important for data synchronization:
    - 📫 mensengers
    - 📦 messages
    - 🔄 synchronizers

- **extLibs** are libraries that implement TejoSynchronizer's iterfaces.

- **braidjs** is a [fork](https://github.com/braid-org/braidjs) of a tool developed by the [Braid](https://www.braid.org/) organization. Essentially it's a set of extensions to javascript's existing HTTP communication APIs, implementing the Braid Protocol. The changes done to the original repository are minimal and reflect the needs that emerged while developing the Braid messenger present in the `extLibs` module.

- (WYP) **FabricDemo** includes demonstrations of the capabilities of the framework. In this module are the tests presented in the report.

- (WYP) **Relatório** is the source code for the report, written in LaTeX  💫





