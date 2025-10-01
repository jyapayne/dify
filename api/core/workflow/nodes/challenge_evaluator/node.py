# pyright: reportImplicitRelativeImport=none

from __future__ import annotations

import logging
import time
from collections.abc import Mapping
from typing import Any

from core.variables.segments import Segment
from core.workflow.enums import ErrorStrategy, NodeExecutionType, NodeType, WorkflowNodeExecutionStatus
from core.workflow.node_events import NodeRunResult
from core.workflow.nodes.base.entities import BaseNodeData, RetryConfig
from core.workflow.nodes.base.node import Node
from extensions.ext_database import db
from models.challenge import Challenge
from services.challenge_scorer_service import ChallengeScorerService
from services.challenge_service import ChallengeService

logger = logging.getLogger(__name__)


class ChallengeEvaluatorNode(Node):
    node_type = NodeType.CHALLENGE_EVALUATOR
    execution_type = NodeExecutionType.EXECUTABLE

    _node_data: BaseNodeData

    def init_node_data(self, data: Mapping[str, Any]):
        # Using BaseNodeData to carry title/desc; node data is accessed directly
        self._node_data = BaseNodeData.model_validate(data)
        self._config: dict[str, Any] = data

    def _get_error_strategy(self) -> ErrorStrategy | None:
        return getattr(self._node_data, 'error_strategy', None)

    def _get_retry_config(self) -> RetryConfig:
        return getattr(self._node_data, 'retry_config', RetryConfig())

    def _get_title(self) -> str:
        return getattr(self._node_data, 'title', 'Challenge Evaluator')

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
        # Resolve response text from selector in config.inputs.response (frontend schema)
        output_text = ''
        source_selector = None
        inputs_cfg = self._config.get('inputs') or {}
        if isinstance(inputs_cfg, dict):
            source_selector = inputs_cfg.get('response')
        # fallback to older key if any
        source_selector = source_selector or self._config.get('value_selector')

        # Check evaluation mode from config
        evaluation_mode = self._config.get('evaluation_mode', 'rules')

        logger.info("ChallengeEvaluator - evaluation_mode: %s, source_selector: %s", evaluation_mode, source_selector)

        # Initialize judge variables
        is_judge_input = False
        judge_passed = False
        judge_rating = 0
        judge_feedback_from_input = ''
        output_text = ''

        def _segment_to_value(segment: Segment | None) -> Any:
            if segment is None:
                return None
            if hasattr(segment, "to_object"):
                try:
                    return segment.to_object()
                except Exception:  # pragma: no cover - defensive
                    pass
            return getattr(segment, "value", segment)

        # If evaluation_mode is 'llm-judge', try to read from upstream Judging LLM node
        if evaluation_mode == 'llm-judge' and source_selector and len(source_selector) >= 1:
            try:
                node_id = source_selector[0]
                # Retrieve judge outputs as Segments and convert to primitive values
                passed_segment = self.graph_runtime_state.variable_pool.get([node_id, 'judge_passed'])
                rating_segment = self.graph_runtime_state.variable_pool.get([node_id, 'judge_rating'])
                feedback_segment = self.graph_runtime_state.variable_pool.get([node_id, 'judge_feedback'])

                potential_judge_passed = _segment_to_value(passed_segment)
                potential_judge_rating = _segment_to_value(rating_segment)
                potential_judge_feedback = _segment_to_value(feedback_segment)

                logger.info(
                    "ChallengeEvaluator - Reading judge outputs: passed=%s, rating=%s, feedback=%s",
                    potential_judge_passed,
                    potential_judge_rating,
                    potential_judge_feedback,
                )

                # If judge_passed exists, we successfully read from a Judging LLM node
                if potential_judge_passed is not None:
                    is_judge_input = True
                    judge_passed = bool(potential_judge_passed)
                    judge_rating = int(potential_judge_rating or 0)
                    judge_feedback_from_input = str(potential_judge_feedback or '')
                    logger.info(
                        "ChallengeEvaluator - Judge input successfully read! passed=%s, rating=%s, feedback=%s",
                        judge_passed,
                        judge_rating,
                        judge_feedback_from_input,
                    )
            except Exception as e:
                logger.error("ChallengeEvaluator - Error reading judge outputs: %s", e, exc_info=True)
                is_judge_input = False

        # If not using judge input, get text output for rules-based evaluation
        if not is_judge_input and source_selector:
            try:
                segment = self.graph_runtime_state.variable_pool.get(source_selector)
                if segment is None:
                    output_text = ''
                elif hasattr(segment, 'text'):
                    output_text = segment.text
                else:
                    output_text = str(_segment_to_value(segment) or '')
            except Exception:
                output_text = ''

        # Evaluate based on mode
        if is_judge_input:
            ok = judge_passed
            details = {
                'mode': 'llm-judge',
                'rating': judge_rating,
                'feedback': judge_feedback_from_input,
            }
        else:
            # Rules-based evaluation (only if not using judge input)
            ok, details = ChallengeService.evaluate_outcome(output_text, self._config)

        # optional persistence if config carries challenge_id
        challenge_id = self._config.get('challenge_id')
        if challenge_id:
            try:
                # Calculate elapsed time in milliseconds
                elapsed_ms = int((time.time() - self.graph_runtime_state.start_at) * 1000)

                # Get total tokens used in the workflow so far
                tokens_total = self.graph_runtime_state.total_tokens

                # Extract judge_rating from details if available (for highest_rating strategy)
                judge_rating = None
                judge_feedback = None
                if isinstance(details, dict):
                    judge_rating = details.get('rating')
                    judge_feedback = details.get('feedback')

                # Load challenge to check scoring strategy
                challenge = db.session.get(Challenge, str(challenge_id))

                # Score field is reserved for custom scoring plugins.
                # For built-in strategies (first, fastest, fewest_tokens, highest_rating),
                # the leaderboard sorts by specific columns (created_at, elapsed_ms, tokens_total, judge_rating).
                score = None

                # If custom scoring is configured, compute score using plugin
                if challenge and challenge.scoring_strategy == 'custom':
                    try:
                        metrics = {
                            'succeeded': ok,
                            'tokens_total': tokens_total,
                            'elapsed_ms': elapsed_ms,
                            'rating': judge_rating,
                            'created_at': int(time.time() * 1000),
                        }

                        ctx = {
                            'tenant_id': self.tenant_id,
                            'app_id': self.app_id,
                            'workflow_id': self.workflow_id,
                            'challenge_id': str(challenge_id),
                            'end_user_id': None,
                            'timeout_ms': 5000,
                        }

                        result = ChallengeScorerService.score_with_plugin(
                            scorer_plugin_id=challenge.scoring_plugin_id,
                            scorer_entrypoint=challenge.scoring_entrypoint,
                            metrics=metrics,
                            config=challenge.scoring_config or {},
                            ctx=ctx,
                        )

                        score = result.get('score')
                        logger.info(
                            "Custom scorer computed score: %s (details: %s)",
                            score,
                            result.get('details'),
                        )
                    except Exception as e:
                        logger.error("Custom scorer failed: %s", e, exc_info=True)
                        # Continue with score=None on error

                ChallengeService.record_attempt(
                    tenant_id=self.tenant_id,
                    challenge_id=challenge_id,
                    end_user_id=None,
                    account_id=None,
                    workflow_run_id=None,
                    succeeded=ok,
                    score=score,
                    judge_rating=judge_rating,
                    judge_feedback=judge_feedback,
                    tokens_total=tokens_total,
                    elapsed_ms=elapsed_ms,
                    session=db.session,
                )
            except Exception:
                # do not crash the workflow if recording fails
                pass

        # Always provide all output variables to match frontend getOutputVars
        outputs: dict[str, Any] = {
            'challenge_succeeded': ok,
            'judge_rating': 0,
            'judge_feedback': '',
            'message': '',
        }

        # Override with actual values if evaluator provides them
        if isinstance(details, dict):
            logger.debug("ChallengeEvaluator - details: %s", details)
            if 'rating' in details:
                outputs['judge_rating'] = details.get('rating')
            if 'feedback' in details:
                outputs['judge_feedback'] = details.get('feedback')
            if 'message' in details:
                outputs['message'] = details.get('message')
            # If no explicit message, create one from evaluation details
            if not outputs['message']:
                if ok:
                    outputs['message'] = f"Success: {details.get('mode', 'evaluation')} matched"
                else:
                    outputs['message'] = f"Failed: {details.get('mode', 'evaluation')} did not match"

        return NodeRunResult(
            status=WorkflowNodeExecutionStatus.SUCCEEDED,
            outputs=outputs,
        )

