# Urban routing reference implementation

This package was recovered from `feature/urban-routing-modular`. It is a small,
dependency-light implementation that defines its own `Node`, `Edge`, and
`Graph` types for coursework and algorithm study.

It is intentionally separate from the production `routing/` package:

- `routing/` loads scenario conditions, uses NetworkX, validates requests,
  records search traces, and returns the frontend API contract;
- `urban_routing/` demonstrates the core algorithms with a minimal custom
  graph and a smaller result format.

Run the reference demonstration from the repository root:

```powershell
python -m urban_routing
```

Do not import this package from `backend/`. Production changes belong in
`routing/` and must preserve its standard result contract.
