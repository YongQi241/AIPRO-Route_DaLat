from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "generated_routes_connected"
DEFAULT_SEED = 2026

SCENARIOS = {
    "S0": {
        "name": "weekday_normal",
        "congestion": (1.3, 0.55),
        "time_per_level": 0.07,
        "rain": (0, 1),
        "fog": (0, 0),
        "construction_probability": 0.03,
        "closure_probability": 0.00,
    },
    "S1": {
        "name": "weekend_busy",
        "congestion": (3.4, 0.9),
        "time_per_level": 0.11,
        "rain": (0, 1),
        "fog": (0, 1),
        "construction_probability": 0.06,
        "closure_probability": 0.015,
    },
    "S2": {
        "name": "evening_rush",
        "congestion": (4.0, 0.85),
        "time_per_level": 0.15,
        "rain": (0, 1),
        "fog": (0, 2),
        "construction_probability": 0.08,
        "closure_probability": 0.025,
    },
    "S3": {
        "name": "heavy_rain",
        "congestion": (3.0, 0.9),
        "time_per_level": 0.13,
        "rain": (2, 5),
        "fog": (0, 2),
        "construction_probability": 0.10,
        "closure_probability": 0.04,
    },
    "S4": {
        "name": "dense_fog",
        "congestion": (2.3, 0.8),
        "time_per_level": 0.12,
        "rain": (0, 2),
        "fog": (2, 5),
        "construction_probability": 0.07,
        "closure_probability": 0.035,
    },
}


def generate_edge_conditions(
    edges: pd.DataFrame,
    *,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    """Create varied but reproducible conditions for every scenario and edge."""

    required = {"edge_id", "congestion_level", "risk_score"}
    missing = sorted(required.difference(edges.columns))
    if missing:
        raise ValueError(f"edges.csv is missing columns: {', '.join(missing)}")

    rng = np.random.default_rng(seed)
    rows = []

    for scenario_id, config in SCENARIOS.items():
        for edge in edges.itertuples(index=False):
            base_congestion = float(getattr(edge, "congestion_level", 1))
            mean, deviation = config["congestion"]
            congestion = int(
                np.clip(
                    np.rint(
                        rng.normal(mean + (base_congestion - 1) * 0.18, deviation)
                    ),
                    1,
                    5,
                )
            )
            rain_risk = int(rng.integers(config["rain"][0], config["rain"][1] + 1))
            fog_risk = int(rng.integers(config["fog"][0], config["fog"][1] + 1))
            construction_penalty = (
                int(rng.integers(1, 4))
                if rng.random() < config["construction_probability"]
                else 0
            )
            is_backbone = bool(getattr(edge, "backbone_edge", False))
            closed = (
                not is_backbone
                and rng.random() < config["closure_probability"]
            )
            weather_delay = rain_risk * 0.035 + fog_risk * 0.03
            construction_delay = construction_penalty * 0.04
            random_delay = rng.uniform(-0.035, 0.045)
            time_multiplier = max(
                1.0,
                1.0
                + (congestion - 1) * config["time_per_level"]
                + weather_delay
                + construction_delay
                + random_delay,
            )

            rows.append(
                {
                    "scenario_id": scenario_id,
                    "scenario_name": config["name"],
                    "edge_id": edge.edge_id,
                    "congestion_level": congestion,
                    "time_multiplier": round(time_multiplier, 3),
                    "rain_risk": rain_risk,
                    "fog_risk": fog_risk,
                    "construction_penalty": construction_penalty,
                    "closed": closed,
                }
            )

    return pd.DataFrame(rows)


def main() -> None:
    edges = pd.read_csv(DATA_DIR / "edges.csv")
    conditions = generate_edge_conditions(edges)
    output_path = DATA_DIR / "edge_conditions.csv"
    conditions.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(
        f"Wrote {len(conditions)} conditions for {len(SCENARIOS)} scenarios "
        f"to {output_path}"
    )


if __name__ == "__main__":
    main()
