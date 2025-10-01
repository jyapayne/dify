from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from core.workflow.enums import ErrorStrategy, NodeExecutionType, NodeType, WorkflowNodeExecutionStatus
from core.workflow.node_events import NodeRunResult
from core.workflow.nodes.base.entities import BaseNodeData, RetryConfig
from core.workflow.nodes.base.node import Node


class TeamChallengeNode(Node):
    node_type = NodeType.TEAM_CHALLENGE
    execution_type = NodeExecutionType.EXECUTABLE

    _node_data: BaseNodeData

    def init_node_data(self, data: Mapping[str, Any]):
        self._node_data = BaseNodeData.model_validate(data)
        self._config: dict[str, Any] = data

    def _get_error_strategy(self) -> ErrorStrategy | None:
        return getattr(self._node_data, 'error_strategy', None)

    def _get_retry_config(self) -> RetryConfig:
        return getattr(self._node_data, 'retry_config', RetryConfig())

    def _get_title(self) -> str:
        return getattr(self._node_data, 'title', 'Team Challenge')

    def _get_description(self) -> str | None:
        return getattr(self._node_data, 'desc', None)

    def _get_default_value_dict(self) -> dict[str, Any]:
        return getattr(self._node_data, 'default_value_dict', {})

    def get_base_node_data(self) -> BaseNodeData:
        return self._node_data

    @classmethod
    def version(cls) -> str:
        return "1"

    def _run(self) -> NodeRunResult:
        # Read inputs.team_choice for consistency with FE
        inputs_cfg = self._config.get('inputs') or {}
        team_choice = ''
        if isinstance(inputs_cfg, dict):
            team_choice_selector = inputs_cfg.get('team_choice')
            if team_choice_selector:
                try:
                    v = self.graph_runtime_state.variable_pool.get_value_by_selector(team_choice_selector)
                    team_choice = str(v or '')
                except Exception:
                    team_choice = ''

        outputs = {
            'team': team_choice,
            'judge_passed': False,
            'judge_rating': 0,
            'judge_feedback': '',
            'categories': {},
            'team_points': 0.0,
            'total_points': 0.0,
        }
        return NodeRunResult(status=WorkflowNodeExecutionStatus.SUCCEEDED, outputs=outputs)


