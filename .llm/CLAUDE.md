# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a workspace of small, independent study projects (course "jornada-dados", module 1). Each subdirectory is self-contained; there is no shared build system, package manager, or test suite at the root.

- `calculadora-python/` — Tkinter GUI calculator in a single file (`main.py`). Standard library only, no dependencies.
- `HelloWorldClaudeCode/` — placeholder project; `.llm/prd.md` is meant to hold its product requirements (currently empty).

Code, identifiers, comments, and docs are written in Portuguese (pt-BR) — keep new code consistent with that.

## calculadora-python

Run (from `calculadora-python/`):

```bash
python main.py
```

There are no tests or linters configured. The pure logic can be exercised without opening a window:

```bash
python -c "from main import avaliar, formatar; print(formatar(avaliar('2+3×4')))"
```

Architecture:
- `avaliar()` is a safe expression evaluator: it normalizes display symbols (`×`→`*`, `÷`→`/`, `,`→`.`), parses with `ast.parse(mode="eval")`, and walks the tree allowing only numeric constants and the operators in the `OPERADORES` map. Never replace this with `eval` — the README explicitly documents this as a security property. To support a new operator, add it to `OPERADORES`.
- `formatar()` turns integral floats into ints and rounds to 10 decimal places for display.
- `Calculadora(tk.Tk)` builds the UI from the `BOTOES` grid; every button and key press funnels through `clicar(texto)`, which is the single state machine operating on the `expressao` string (with `historico` showing the last evaluated expression). `tecla()` maps keyboard characters onto `clicar` (parentheses are keyboard-only). The `"Erro"` display state is cleared on the next input.
- `%` is modulo (Python `%`), not percentage.
