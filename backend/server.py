from __future__ import annotations

import argparse
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from routing import solve
from routing.solver import (
    MULTI_ROUTE_ALGORITHMS,
    normalize_algorithm,
)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "generated"
REQUIRED_FIELDS = ("algorithm", "start_node")
API_VERSION = "2.0"
ALGORITHM_CAPABILITIES = [
    {"id": "bfs", "name": "Tìm kiếm theo chiều rộng", "mode": "single_route"},
    {"id": "dfs", "name": "Tìm kiếm theo chiều sâu", "mode": "single_route"},
    {"id": "ucs", "name": "Tìm kiếm chi phí đồng nhất", "mode": "single_route"},
    {"id": "dijkstra", "name": "Dijkstra", "mode": "single_route"},
    {"id": "astar", "name": "Tìm kiếm A*", "mode": "single_route"},
    {
        "id": "greedy",
        "name": "Tìm kiếm Tham Lam ưu tiên tốt nhất",
        "mode": "single_route",
    },
    {
        "id": "hill_climbing",
        "name": "Leo đồi",
        "mode": "single_route",
    },
    {
        "id": "nearest_neighbor",
        "name": "Láng giềng gần nhất",
        "mode": "multi_location",
    },
    {
        "id": "brute_force_tsp",
        "name": "TSP chính xác (duyệt cạn)",
        "mode": "multi_location",
        "maximum_targets": 8,
    },
]


def calculate_route(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate an HTTP payload and pass it to the unified solver."""

    missing = [field for field in REQUIRED_FIELDS if not payload.get(field)]
    if missing:
        return {
            "status": "invalid_input",
            "algorithm": payload.get("algorithm", ""),
            "scenario_id": payload.get("scenario_id", "S0"),
            "optimization": payload.get("optimization", "balanced"),
            "start_node": payload.get("start_node", ""),
            "goal_node": payload.get("goal_node", ""),
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "metrics": {},
            "segments": [],
            "explanation": "Yêu cầu định tuyến thiếu trường bắt buộc.",
            "optimality_note": "Chưa tính được tuyến đường.",
            "message": f"Thiếu trường bắt buộc: {', '.join(missing)}.",
        }

    visit_nodes = payload.get("visit_nodes", [])
    if not isinstance(visit_nodes, list) or not all(
        isinstance(node, str) for node in visit_nodes
    ):
        return {
            "status": "invalid_input",
            "algorithm": payload["algorithm"],
            "scenario_id": payload.get("scenario_id", "S0"),
            "optimization": payload.get("optimization", "balanced"),
            "start_node": payload["start_node"],
            "goal_node": payload.get("goal_node", ""),
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "metrics": {},
            "segments": [],
            "explanation": "Yêu cầu định tuyến có trường visit_nodes không hợp lệ.",
            "message": "visit_nodes phải là một mảng chuỗi mã nút.",
        }

    normalized_algorithm = normalize_algorithm(str(payload["algorithm"]))
    if visit_nodes and normalized_algorithm not in MULTI_ROUTE_ALGORITHMS:
        return {
            "status": "invalid_input",
            "algorithm": payload["algorithm"],
            "scenario_id": payload.get("scenario_id", "S0"),
            "optimization": payload.get("optimization", "balanced"),
            "start_node": payload["start_node"],
            "goal_node": payload.get("goal_node", ""),
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "metrics": {},
            "segments": [],
            "explanation": (
                "Địa điểm trung gian cần thuật toán đa địa điểm."
            ),
            "message": (
                "Điểm dừng trung gian chỉ dùng được với Láng giềng gần nhất "
                "hoặc TSP chính xác. Hãy xóa các điểm trung gian hoặc chọn "
                "một trong hai thuật toán đa địa điểm này."
            ),
        }

    result = solve(
        algorithm=str(payload["algorithm"]),
        start_node=str(payload["start_node"]),
        goal_node=payload.get("goal_node"),
        visit_nodes=visit_nodes,
        scenario_id=str(payload.get("scenario_id", "S0")),
        optimization=str(payload.get("optimization", "balanced")),
        data_dir=DATA_DIR,
        return_to_start=bool(payload.get("return_to_start", False)),
    )
    result["api_version"] = API_VERSION
    return result


class RouteRequestHandler(BaseHTTPRequestHandler):
    server_version = f"DaLatRouteAPI/{API_VERSION}"

    def _send_json(
        self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK
    ) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self) -> None:
        self._send_json({})

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        if path == "/api/health":
            self._send_json(
                {
                    "status": "ok",
                    "service": "dalat-route-api",
                    "version": API_VERSION,
                }
            )
            return
        if path == "/api/algorithms":
            self._send_json(
                {
                    "status": "ok",
                    "version": API_VERSION,
                    "algorithms": ALGORITHM_CAPABILITIES,
                }
            )
            return
        self._send_json(
            {"status": "not_found", "message": "Không tìm thấy điểm cuối."},
            HTTPStatus.NOT_FOUND,
        )

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/routes/solve":
            self._send_json(
                {"status": "not_found", "message": "Không tìm thấy điểm cuối."},
                HTTPStatus.NOT_FOUND,
            )
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(payload, dict):
                raise ValueError("Nội dung JSON phải là một đối tượng.")
        except (json.JSONDecodeError, ValueError) as error:
            self._send_json(
                {"status": "invalid_input", "message": str(error)},
                HTTPStatus.BAD_REQUEST,
            )
            return

        self._send_json(calculate_route(payload))

    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chạy API định tuyến Đà Lạt.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), RouteRequestHandler)
    print(f"API định tuyến đang lắng nghe tại http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
