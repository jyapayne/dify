from __future__ import annotations

import json
import re
from collections.abc import Mapping
from typing import Any

from core.model_manager import ModelManager
from core.model_runtime.entities.llm_entities import LLMResult
from core.model_runtime.entities.message_entities import (
    PromptMessageContentType,
    SystemPromptMessage,
    UserPromptMessage,
)
from core.model_runtime.entities.model_entities import ModelType
from core.workflow.enums import ErrorStrategy, NodeExecutionType, NodeType, WorkflowNodeExecutionStatus
from core.workflow.node_events import NodeRunResult
from core.workflow.nodes.base.entities import BaseNodeData, RetryConfig
from core.workflow.nodes.base.node import Node
from services.challenge_service import ChallengeService


class JudgingLLMNode(Node):
    node_type = NodeType.JUDGING_LLM
    execution_type = NodeExecutionType.EXECUTABLE

    _node_data: BaseNodeData

    def init_node_data(self, data: Mapping[str, Any]):
        self._node_data = BaseNodeData.model_validate(data)
        # Access data directly from node_data, not from a 'config' key
        self._config: dict[str, Any] = data

    def _get_error_strategy(self) -> ErrorStrategy | None:
        return getattr(self._node_data, 'error_strategy', None)

    def _get_retry_config(self) -> RetryConfig:
        return getattr(self._node_data, 'retry_config', RetryConfig())

    def _get_title(self) -> str:
        return getattr(self._node_data, 'title', 'Judging LLM')

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
        # Placeholder with FE-compatible keys. Extract inputs for future wiring.
        inputs_cfg = self._config.get('inputs') or {}
        goal_selector = None
        response_selector = None
        if isinstance(inputs_cfg, dict):
            goal_selector = inputs_cfg.get('goal')
            response_selector = inputs_cfg.get('response')

        # Attempt to read variables (not used in placeholder decision)
        _ = None
        try:
            if goal_selector:
                _ = self.graph_runtime_state.variable_pool.get(goal_selector)
            if response_selector:
                _ = self.graph_runtime_state.variable_pool.get(response_selector)
        except Exception:
            pass

        outputs = {
            'judge_passed': False,
            'judge_rating': 0,
            'judge_feedback': '',
        }

        # If model config and rubric provided, invoke LLM synchronously to judge
        judge_model = self._config.get('judge_model') or {}
        rubric = self._config.get('rubric_prompt_template') or ''
        provider = (judge_model or {}).get('provider')
        model_name = (judge_model or {}).get('name')
        completion_params = (judge_model or {}).get('completion_params') or {}

        def _segment_to_text(seg: Any) -> str:
            try:
                # Many variable types expose .text
                if hasattr(seg, 'text'):
                    return str(seg.text)
                if isinstance(seg, (dict, list)):
                    return json.dumps(seg, ensure_ascii=False)
                return str(seg)
            except Exception:
                return ''

        # Debug: log what we're checking
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            "JudgingLLM check - provider: %s, model: %s, rubric_len: %s, response_selector: %s",
            provider,
            model_name,
            len(rubric) if rubric else 0,
            response_selector,
        )

        if provider and model_name and rubric and response_selector:
            logger.info("JudgingLLM: All conditions met, invoking LLM...")
            try:
                goal_val = self.graph_runtime_state.variable_pool.get(goal_selector) if goal_selector else None
                response_val = self.graph_runtime_state.variable_pool.get(response_selector)
                goal_text = _segment_to_text(goal_val)
                response_text = _segment_to_text(response_val)
                json_template = '{"passed": boolean, "rating": number (0-10), "feedback": string}'

                prompt_body = (
                    f"Goal:\n{goal_text}\n\n"
                    f"Response:\n{response_text}\n\n"
                    f"Return JSON with rating 0-10: {json_template}"
                )

                prompt_messages = [
                    SystemPromptMessage(content=rubric),
                    UserPromptMessage(content=prompt_body),
                ]

                model_instance = ModelManager().get_model_instance(
                    tenant_id=self.tenant_id,
                    model_type=ModelType.LLM,
                    provider=provider,
                    model=model_name,
                )
                result: LLMResult = model_instance.invoke_llm(
                    prompt_messages=prompt_messages,
                    model_parameters=completion_params,
                    stop=[],
                    stream=False,
                    user=self.user_id,
                )  # type: ignore
                # Extract text from result
                text_out = ''
                content = getattr(result.message, 'content', '')
                if isinstance(content, str):
                    text_out = content
                elif isinstance(content, list):
                    for item in content:
                        if getattr(item, 'type', None) == PromptMessageContentType.TEXT:
                            text_out += str(getattr(item, 'data', ''))
                else:
                    text_out = str(content)

                # Parse last JSON object in output
                verdict: dict[str, Any] | None = None
                try:
                    matches = re.findall(r"\{[\s\S]*\}", text_out)
                    if matches:
                        verdict = json.loads(matches[-1])
                except Exception:
                    verdict = None

                if isinstance(verdict, dict):
                    outputs['judge_passed'] = bool(verdict.get('passed'))
                    outputs['judge_rating'] = int(verdict.get('rating') or 0)
                    outputs['judge_feedback'] = str(verdict.get('feedback') or '')
                    outputs['judge_raw'] = json.dumps(verdict)
                else:
                    # Fallback to simple rules if configured
                    success_type = self._config.get('success_type')
                    success_pattern = self._config.get('success_pattern')
                    if success_type and success_pattern:
                        ok, _ = ChallengeService.evaluate_outcome(response_text, {
                            'success_type': success_type,
                            'success_pattern': success_pattern,
                        })
                        outputs['judge_passed'] = ok
                        outputs['judge_rating'] = 10 if ok else 0
                        outputs['judge_feedback'] = 'passed by rules' if ok else 'failed by rules'
            except Exception as e:
                # keep default outputs on error
                logger.error("JudgingLLM error: %s", e, exc_info=True)
                pass
        else:
            logger.warning("JudgingLLM skipped - missing required fields")
        return NodeRunResult(status=WorkflowNodeExecutionStatus.SUCCEEDED, outputs=outputs)

