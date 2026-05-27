# STU ↔ SWU Commodity Comparison

Generated during STU research import planning.

## Existing SWU commodities before STU import

| SWU ID | SWU name              | Note                                                                                                                                                                        |
| -----: | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      1 | Credits               | Exists; maps best to Latinum/Currency layer, but STU ID 1 is Nahrung. Requires migration/alias decision.                                                                    |
|      2 | Durastahl             | Existing SWU construction metal; STU ID 2 is Baumaterial. For STU granularity, Baumaterial should become its own resource or Durastahl becomes an alias, not a replacement. |
|      3 | Tibanna-Gas           | Existing SWU weapon gas; STU ID 3 is Chemische Komponenten. Needs remap.                                                                                                    |
|      4 | Kyber-Kristalle       | Existing SWU crystal; STU ID 4 is Transparentes Aluminium. Needs remap.                                                                                                     |
|      5 | Beskar                | Existing SWU rare metal; STU ID 5 is Deuterium. Needs remap.                                                                                                                |
|      6 | Kristallines Silizium | Existing SWU electronics material; STU ID 6 is Antimaterie. Needs remap.                                                                                                    |
|      7 | Energiemodule         | Existing SWU energy part; STU ID 7 is Plasma. Needs remap.                                                                                                                  |

## Decision

Target resource granularity should follow STU. Current SWU IDs 1-7 conflict with STU IDs and should not be used as-is for research import.

Recommended next implementation:

1. Treat imported STU commodity IDs as canonical for gameplay costs.
2. Preserve all STU commodity IDs as `sourceId` and preferably as actual `id` in game-data where feasible.
3. Rename only where names are strongly Star-Trek-specific or where SWU terminology is clearer.
4. Maintain aliases for existing SWU names while migrating costs/UI.
5. Use one shared commodity mapping for research, buildings, modules, and ship/rump costs.

## Core mapping examples

| STU ID | Raw STU name             | Proposed SWU display name |
| -----: | ------------------------ | ------------------------- |
|      1 | Nahrung                  | Nahrung                   |
|      2 | Baumaterial              | Baumaterial               |
|      3 | Chemische Komponenten    | Chemische Komponenten     |
|      4 | Transparentes Aluminium  | Transparistahl            |
|      5 | Deuterium                | Deuterium                 |
|      6 | Antimaterie              | Antimaterie               |
|      7 | Plasma                   | Plasma                    |
|      8 | Dilithium                | Kyber-Kristalle           |
|     19 | Tritanium-Erz            | Titanerz                  |
|     21 | Duranium                 | Durastahl                 |
|     29 | Tritanium                | Titanlegierung            |
|     31 | Isolineare Speicherchips | Speicherchips             |
|     34 | Subraum-Feldspulen       | Hyperraum-Feldspulen      |
|     50 | Latinum                  | Credits                   |

Full generated mapping: `docs/generated/stu-commodity-mapping.yaml`.
