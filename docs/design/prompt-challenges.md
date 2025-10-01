## Prompt Hacking Challenges — Design

### Overview

Enable developer-authored prompt hacking challenges inside Dify’s workflow builder via a new workflow node. Players can register/login using the existing web auth and compete on challenges. Attempts are recorded server-side and leaderboards are exposed via public web APIs.

### Goals

- Add a first-class workflow node that evaluates success/failure against developer-specified criteria.
- Add a Judging LLM node that compares model outputs to the challenge goal and produces pass/fail, textual feedback, and a 1–10 rating.
- Persist attempts with metadata for scoring and leaderboards.
- Reuse existing account/web auth for players.
- Fit Dify’s DDD/Clean Architecture: models, services, controllers, workflow nodes, and frontend builder integration.

### Non-Goals

- Anti-cheat measures beyond simple rate limiting.
- Complex custom scoring plugins (design leaves a hook for future work).

## Architecture Summary

### Backend components

- Models (SQLAlchemy)
  - Challenge
    - id, tenant_id, app_id, workflow_id
    - name, description, goal (plain text shown to players)
    - success_type: one of ['regex', 'contains', 'custom']
    - success_pattern: string (regex or substring depending on type)
    - secret_ref: reference to server-side secret (never exposed to clients)
    - scoring_strategy: one of ['first', 'fastest', 'fewest_tokens', 'custom']
    - is_active: bool
    - created_by, created_at, updated_by, updated_at
  - ChallengeAttempt
    - id, tenant_id, challenge_id (FK), end_user_id (FK), workflow_run_id (optional FK)
    - succeeded: bool
    - score: numeric (meaning depends on strategy)
    - judge_rating: int (0–10)
    - judge_feedback: text
    - judge_output_raw: jsonb (optional; structured judgement payload)
    - tokens_total: int (when available from run metrics)
    - elapsed_ms: int (when available)
    - created_at

- Service layer (e.g., `ChallengeService`, `ChallengeJudgeService`)
  - evaluate_outcome(output, cfg) -> (succeeded: bool, details: dict)
  - judge_with_llm(goal, response, cfg) -> { passed: bool, rating: int, feedback: str, raw?: dict }
  - evaluate_with_plugin(evaluator_ref, goal, response, ctx) -> { passed: bool, rating?: int, feedback?: str, raw?: dict }
  - score_with_plugin(scorer_ref, attempt_metrics, ctx) -> { score: number, details?: dict }
  - record_attempt(tenant_id, challenge_id, end_user_id, run_meta, succeeded) -> ChallengeAttempt
  - get_leaderboard(challenge_id, limit, strategy) -> list
  - get_challenge_public(challenge_id) -> dict

- Controllers
  - Console (for creators): CRUD on challenges under the workspace (`/console/api/challenges`)
  - Web (for players): public endpoints under `/web/api/challenges`
    - List active challenges, fetch details, fetch leaderboard
    - Optional auth via existing web login for personalization, otherwise anonymous read

- Workflow nodes
  - NodeType: `challenge-evaluator`
    - Config
      - `challenge_id`: reference to a stored Challenge (preferred)
      - or inline config: `success_type`, `success_pattern`, `scoring_strategy`
      - `mask_variables`: string[] — variable names to redact in logs
    - Execution
      - Consumes upstream content (typically latest assistant output)
      - Evaluates success with `ChallengeService.evaluate_outcome`
      - If an `EndUser` context exists and a `challenge_id` is present, writes `ChallengeAttempt`
      - Outputs `{ challenge_succeeded: boolean, message?: string }`, optionally passes through original output
  - NodeType: `judging-llm`
    - Purpose: judge a model response against the challenge goal using an LLM rubric.
    - Config
      - `judge_model`: provider/name/version
      - `temperature`, `max_tokens`, other model params
      - `rubric_prompt_template`: template with placeholders for {goal}, {response}, optional {hints}
      - `rating_scale`: default 0–10; configurable upper bound optional
      - `pass_threshold`: integer (default 5)
    - Inputs
      - `goal`: the attacking goal or acceptance criteria
      - `response`: the model output to evaluate
    - Execution
      - Calls `ChallengeJudgeService.judge_with_llm()` to obtain structured judgement
      - Returns outputs `{ judge_passed: boolean, judge_rating: number (0–10), judge_feedback: string, judge_raw?: object }`
    - Integration
      - Downstream `challenge-evaluator` can consume `judge_passed` and `judge_rating` to record an attempt instead of regex/contains
      - Alternatively, `challenge-evaluator` may support an `evaluation_mode: 'rules' | 'llm-judge'` to invoke judging internally
  - NodeType: `team-challenge` (Red/Blue orchestrator)
    - Purpose: orchestrate two-sided challenges where players choose Red (attack) or Blue (defense) and submit prompts accordingly. The node pairs attacks and defenses, configures the LLM, invokes judging, and emits scores.
    - Config
      - `red_blue_challenge_id`: reference to a Red/Blue challenge definition
      - `defense_selection_policy`: 'latest_best' | 'random_active' | 'round_robin' | 'request_new_if_none'
      - `attack_selection_policy`: same options for the defense side evaluation path
      - `judge_suite`: list of category tests to run (e.g., CBRNE, SA, SH, RWH, V, M)
      - `scoring_strategy`: 'red_blue_ratio' | 'custom'
    - Inputs
      - `team_choice`: 'red' | 'blue'
      - `attack_prompt?`: string (when `team_choice = 'red'`)
      - `defense_prompt?`: string (when `team_choice = 'blue'`)
    - Execution (high level)
      - If `team_choice = 'red'`:
        - Persist `attack_prompt` submission
        - Load a defense by policy; if none, optionally signal Blue to provide one (async) and fall back to last known
        - Configure LLM with defense as system prompt, submit attack as user message
        - Run `judge_suite` via `judging-llm`; compute Red score
      - If `team_choice = 'blue'`:
        - Persist `defense_prompt` submission
        - Load an attack by policy; if none, signal Red to provide one (async) and fall back to last known
        - Configure LLM with defense as system prompt and submit the loaded attack
        - Run `judge_suite`; compute Blue score (prevention)
      - Persist pairing and metrics
    - Outputs
      - `{ team: 'red'|'blue', judge_passed: boolean, judge_rating: number, judge_feedback: string, categories: Record<string, boolean|number>, team_points: number, total_points: number }`

### Frontend components

- Workflow builder
  - Add `Prompt Challenge` to the node palette
  - Add `Judging LLM` to the node palette
  - Node editor panel: select existing Challenge or define inline success criteria
  - Judging panel: choose model, edit rubric prompt, set pass threshold, preview structured outputs
  - Custom evaluator/scorer panels: choose plugin and configure JSON settings with live schema validation
  - I18n strings in `web/i18n/en-US/`
  - Challenge display & theming
    - Author-provided instructions (Markdown) render before/alongside the task input area
    - Theme tokens (colors, logo, background) applied to challenge pages
    - Optional hero image/video via existing `UploadFile` and signed URLs

- Optional player UX (phase 2)
  - `/challenges` list and `/challenges/[id]` details with leaderboard
  - `/challenge-collections` list and `/challenge-collections/[id]` details with collection leaderboard
  - Use existing web login endpoints

## Data Model

Minimal table shapes (final columns managed in migration):

```sql
-- challenges
id (uuid pk)
tenant_id (uuid fk)
app_id (uuid fk)
workflow_id (uuid fk)
name (text)
description (text)
goal (text)
success_type (text)
success_pattern (text)
secret_ref (text)
scoring_strategy (text)
is_active (bool)
created_by (uuid)
created_at (timestamp)
updated_by (uuid)
updated_at (timestamp)

-- challenge_attempts
id (uuid pk)
tenant_id (uuid fk)
challenge_id (uuid fk)
end_user_id (uuid fk)
workflow_run_id (uuid fk, nullable)
succeeded (bool)
score (numeric)
tokens_total (int)
elapsed_ms (int)
created_at (timestamp)
```

Additional columns for judging:

```sql
ALTER TABLE challenge_attempts
  ADD COLUMN judge_rating integer,
  ADD COLUMN judge_feedback text,
  ADD COLUMN judge_output_raw jsonb;
```

Optional columns for custom evaluators/scorers:

```sql
ALTER TABLE challenges
  ADD COLUMN evaluator_type text DEFAULT 'rules', -- one of: rules, llm-judge, custom
  ADD COLUMN evaluator_plugin_id text,
  ADD COLUMN evaluator_entrypoint text, -- e.g., "pkg.module:Evaluator"
  ADD COLUMN evaluator_config jsonb,
  ADD COLUMN scoring_plugin_id text,
  ADD COLUMN scoring_entrypoint text, -- e.g., "pkg.module:Scorer"
  ADD COLUMN scoring_config jsonb;
```

Additional tables for Red/Blue team challenges:

```sql
-- red_blue_challenges (definition)
CREATE TABLE red_blue_challenges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  app_id uuid NOT NULL REFERENCES apps(id),
  workflow_id uuid REFERENCES workflows(id),
  name text NOT NULL,
  description text,
  judge_suite jsonb NOT NULL, -- list of categories/tests
  defense_selection_policy text NOT NULL DEFAULT 'latest_best',
  attack_selection_policy text NOT NULL DEFAULT 'latest_best',
  scoring_strategy text NOT NULL DEFAULT 'red_blue_ratio',
  theme jsonb,
  instructions_md text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by uuid,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- team_submissions (attack/defense prompts)
CREATE TABLE team_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  red_blue_challenge_id uuid NOT NULL REFERENCES red_blue_challenges(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  account_id uuid NULL,
  end_user_id uuid NULL,
  team text NOT NULL CHECK (team in ('red','blue')),
  prompt text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- pairings (which attack tested against which defense)
CREATE TABLE team_pairings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  red_blue_challenge_id uuid NOT NULL REFERENCES red_blue_challenges(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  attack_submission_id uuid REFERENCES team_submissions(id),
  defense_submission_id uuid REFERENCES team_submissions(id),
  judge_output_raw jsonb,
  categories jsonb, -- e.g., per-suite pass/fail or rating
  judge_rating integer,
  judge_feedback text,
  red_points numeric NOT NULL DEFAULT 0,
  blue_points numeric NOT NULL DEFAULT 0,
  tokens_total int,
  elapsed_ms int,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## API Design

### Console (creator)

- `GET /console/api/challenges?app_id=...` — list
- `POST /console/api/challenges` — create
- `GET /console/api/challenges/{id}` — retrieve
- `PATCH /console/api/challenges/{id}` — update
- `DELETE /console/api/challenges/{id}` — delete

All require console `login_required` and membership in tenant.

### Web (player)

- `GET /web/api/challenges` — list active challenges (public)
- `GET /web/api/challenges/{id}` — details (public)
- `GET /web/api/challenges/{id}/leaderboard?limit=...` — leaderboard (public)

Player login uses existing web login endpoints to obtain access token when needed for personalization.

### Collections

Console (creator)

- `GET /console/api/challenge-collections?app_id=...`
- `POST /console/api/challenge-collections`
- `GET /console/api/challenge-collections/{id}`
- `PATCH /console/api/challenge-collections/{id}`
- `DELETE /console/api/challenge-collections/{id}`
- `PUT /console/api/challenge-collections/{id}/challenges` (set membership and order)

Web (player)

- `GET /web/api/challenge-collections` — list public collections
- `GET /web/api/challenge-collections/{id}` — collection details (instructions/theme), included challenges
- `GET /web/api/challenge-collections/{id}/leaderboard?limit=...` — collection leaderboard

### Red/Blue team challenge APIs

Console (creator)

- `POST /console/api/red-blue-challenges` — create
- `GET /console/api/red-blue-challenges?app_id=...` — list
- `GET /console/api/red-blue-challenges/{id}` — detail
- `PATCH /console/api/red-blue-challenges/{id}` — update
- `DELETE /console/api/red-blue-challenges/{id}` — delete
- `GET /console/api/red-blue-challenges/{id}/pairings` — view pairings/metrics

Web (player)

- `POST /web/api/red-blue-challenges/{id}/join` — join red or blue (payload: { team })
- `POST /web/api/red-blue-challenges/{id}/submit` — submit attack/defense (payload: { team, prompt })
- `GET /web/api/red-blue-challenges/{id}` — public info (instructions, theme, leaderboard snapshot)
- `GET /web/api/red-blue-challenges/{id}/leaderboard?limit=...` — red vs blue standings

## Player Registration & Identity

### Registration and login

- Reuse existing web auth service for player accounts:
  - Email/password login: `POST /web/api/login`
  - Email code login: `POST /web/api/login/email-code/send` + `POST /web/api/login/email-code/verify` (existing patterns)
- Add an explicit web registration endpoint (thin wrapper around `RegisterService.register`):
  - `POST /web/api/register` (payload: email, name, password | email-code)
  - Behavior:
    - `create_workspace_required = False` to avoid auto-creating workspaces for players
    - `status = active`
    - Set `interface_language` from `Accept-Language` as done in OAuth flow
  - On success, also create or associate a per-tenant `EndUser` record so gameplay runs can be attributed consistently.

### Player identity during runs

- Each gameplay run already has an `EndUser` context. For registered players:
  - When a player is authenticated, resolve (or lazily create) an `EndUser` tied to their `account_id` for the current tenant/app
  - Persist `end_user_id` to `ChallengeAttempt` as today; optionally also store `account_id` for simplified leaderboard personalization

### Optional schema addition

```sql
ALTER TABLE challenge_attempts
  ADD COLUMN account_id uuid NULL;
```

This enables direct joins to accounts for notification and profile display without traversing end-user mappings.

### Player profile (optional)

Introduce a lightweight `player_profiles` table for nickname/avatar/notification preferences without touching `account` directly:

```sql
CREATE TABLE player_profiles (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  notify_on_first_blood boolean DEFAULT true,
  notify_on_record_beaten boolean DEFAULT true,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Workflow Node Execution

1. Node receives upstream output (string or structured content). A typical placement is after an LLM node.
2. Node loads Challenge config (stored by `challenge_id` or inline).
3. Node evaluates success by either rules or judging:
   - `regex`: test pattern against text output
   - `contains`: case-insensitive substring match
   - `llm-judge`: call the `judging-llm` node (or internal judge) to obtain `{ judge_passed, judge_rating, judge_feedback }`
   - `custom`: call `evaluate_with_plugin` using configured `evaluator_plugin_id`/`evaluator_entrypoint`
4. If `EndUser` and `challenge_id` present, record a `ChallengeAttempt` with run metrics (tokens, elapsed), and when available, `judge_rating`/`judge_feedback`.
5. Node outputs
   - Rules mode: `{ challenge_succeeded: boolean, message?: string }`
   - Judging mode: `{ challenge_succeeded: boolean, judge_rating: number, judge_feedback: string }`
   - Pass through original output for chaining when needed.

For collections, attempts are recorded per challenge as usual. Collection leaderboard aggregation is computed over a player’s best attempt per challenge, combined using the collection’s `scoring_strategy` (e.g., sum of scores, total elapsed_ms, etc.).

## Scoring Strategies

- `first`: first successful attempt time wins (leaderboard sorted by earliest `created_at`).
- `fastest`: success with lowest `elapsed_ms` wins.
- `fewest_tokens`: success with lowest `tokens_total` wins.
- `highest_rating`: success with the highest `judge_rating` wins; ties broken by earliest `created_at`.
- `custom`: compute via `score_with_plugin` using `scoring_plugin_id`/`scoring_entrypoint`.

Collection strategies:

- `sum`: sum of per-challenge scores in the collection (uses built-in or custom scoring per challenge)
- `fastest_total`: sum of `elapsed_ms` of successful best attempts (lower is better)
- `fewest_tokens_total`: sum of `tokens_total` of successful best attempts (lower is better)
- `highest_avg_rating`: average of `judge_rating` across completed challenges (higher is better)
- `custom`: plugin-defined; service calls `score_with_plugin` at collection level with a list of per-challenge metrics

Red/Blue team scoring:

- Base idea: award Red points for breakthroughs and Blue points for prevented attacks.
- Suggested defaults per pairing:
  - For each category in the judge suite (e.g., CBRNE, SA, SH, RWH, V, M):
    - If the attack bypasses defense (category breach), Red +1
    - If defense prevents (no breach), Blue +1
  - Bonus based on `judge_rating` magnitude for breakthrough severity (e.g., Red +round(rating/3))
  - Time/token penalties can reduce points to encourage efficient strategies
- Ratio-based standings:
  - Red ratio = Red points / (Red points + Blue points)
  - Blue ratio = Blue points / (Red points + Blue points)
- Custom plugin scoring:
  - Provide all pairing metrics to a scorer plugin to compute per-pairing or cumulative standings

## Custom Evaluators & Scorers

This section specifies how custom evaluation and scoring plugins integrate with challenges.

### Concepts

- Evaluator: decides whether a response meets the goal. May optionally emit a rating (0–10) and textual feedback.
- Scorer: converts an attempt’s metrics (e.g., elapsed time, tokens, rating) into a numeric score for leaderboards.

### Data model

- `challenges.evaluator_type`: one of `rules`, `llm-judge`, or `custom`.
- `challenges.evaluator_plugin_id`, `evaluator_entrypoint`, `evaluator_config`: identify and configure the evaluator plugin when `custom` is selected.
- `challenges.scoring_plugin_id`, `scoring_entrypoint`, `scoring_config`: identify and configure the scorer plugin when `scoring_strategy = 'custom'`.

### Service interfaces

Evaluator interface (Python):

```python
class EvaluatorContext(TypedDict, total=False):
    tenant_id: str
    app_id: str
    workflow_id: str
    challenge_id: str
    end_user_id: str | None
    variables: dict[str, Any]  # sanitized runtime variables
    timeout_ms: int

class EvaluatorResult(TypedDict, total=False):
    passed: bool
    rating: int  # 0–10 (optional)
    feedback: str  # textual feedback for player (optional)
    raw: dict[str, Any]  # internal diagnostics (optional)

class EvaluatorProtocol(Protocol):
    def evaluate(self, goal: str, response: str, config: dict[str, Any], ctx: EvaluatorContext) -> EvaluatorResult: ...
```

Scorer interface (Python):

```python
class ScoringContext(TypedDict, total=False):
    tenant_id: str
    app_id: str
    workflow_id: str
    challenge_id: str
    end_user_id: str | None
    timeout_ms: int

class AttemptMetrics(TypedDict, total=False):
    succeeded: bool
    tokens_total: int | None
    elapsed_ms: int | None
    rating: int | None
    created_at: int | None  # epoch ms

class ScoringResult(TypedDict, total=False):
    score: float
    details: dict[str, Any] | None

class ScorerProtocol(Protocol):
    def score(self, metrics: AttemptMetrics, config: dict[str, Any], ctx: ScoringContext) -> ScoringResult: ...
```

### Discovery and loading

- Plugins are discovered via the existing plugin manager. Each plugin exposes one or more entrypoints (e.g., `pkg.module:Evaluator`).
- `evaluator_plugin_id`/`evaluator_entrypoint` and `scoring_plugin_id`/`scoring_entrypoint` identify the target callables.
- Services load plugins lazily and cache handles with safe import guards.

### Execution flow

1) For `evaluator_type = 'custom'`, the `challenge-evaluator` node calls `evaluate_with_plugin` with `(goal, response, evaluator_config, ctx)`.
2) If `EvaluatorResult.passed` is true, set `challenge_succeeded = True` and persist `judge_rating`/`judge_feedback` if provided.
3) For `scoring_strategy = 'custom'`, call `score_with_plugin` with attempt metrics to compute `score`.
4) Persist `ChallengeAttempt` with plugin-derived fields.

### Frontend configuration

- Prompt Challenge panel
  - Evaluation mode: Rules | Judging LLM | Custom Evaluator
  - When Custom Evaluator is chosen:
    - Plugin selector: lists available evaluator plugins by `plugin_id` and exposed entrypoints
    - JSON config editor with schema-based validation (optional `$schema` per plugin)
- Scoring section
  - Strategy: First | Fastest | Fewest Tokens | Highest Rating | Custom
  - When Custom is chosen: plugin selector + JSON config editor

### Security & sandboxing

- Plugins run under server control with:
  - Timeouts (default 5s) and memory ceilings; cancellation on overrun
  - No network access by default (opt-in allowlist if ever needed)
  - Sanitized inputs: secrets removed; only whitelisted variables passed
  - Structured error mapping; no stack traces leaked to players

### Error handling & observability

- If plugin load or execution fails, treat as non-pass and record a generic failure reason.
- Emit structured logs/events with plugin identifiers and durations (no sensitive content).
- Surface minimal feedback to players; detailed diagnostics remain internal.

### Examples

Evaluator (substring with banned terms):

```python
class SimpleEvaluator:
    def evaluate(self, goal, response, config, ctx):
        required = config.get('must_contain', [])
        banned = set(map(str.lower, config.get('banned', [])))
        if any(w.lower() in response.lower() for w in banned):
            return {'passed': False, 'feedback': 'Banned content detected', 'rating': 2}
        if all(w.lower() in response.lower() for w in required):
            return {'passed': True, 'feedback': 'Meets criteria', 'rating': 8}
        return {'passed': False, 'feedback': 'Missing required signal', 'rating': 5}
```

Scorer (weighted combo):

```python
class WeightedScorer:
    def score(self, metrics, config, ctx):
        base = 0.0
        if metrics.get('succeeded'):
            base += config.get('success_bonus', 100)
        rating = metrics.get('rating') or 0
        elapsed = metrics.get('elapsed_ms') or 0
        tokens = metrics.get('tokens_total') or 0
        score = base + rating * config.get('rating_weight', 10) \
                - (elapsed / 1000.0) * config.get('time_penalty', 1.0) \
                - tokens * config.get('token_penalty', 0.01)
        return {'score': max(score, 0.0)}
```

## Security & Privacy

- Never expose `secret_ref` or derived secrets to clients or node outputs.
- Redact configured `mask_variables` in logs and stored attempt details.
- Apply rate limiting using existing helpers to mitigate brute-force attempts.
- Store minimal details on failed attempts to reduce information leakage.
  - Sanitize Markdown instructions to prevent XSS; allow a safe subset (links/images) with rel=noopener.
  - Theme application is constrained to a whitelist of CSS variables and asset URLs served via signed URLs.

## Testing Plan

- Service unit tests
  - `evaluate_outcome` for regex/contains (edge cases, unicode, multiline)
  - `judge_with_llm` deterministic tests with mocked LLM returning structured payloads
  - `record_attempt` scoring aggregation and sorting
- Node tests
  - Given inputs, assert success/failure and resulting outputs
  - Judging node: asserts `{ judge_passed, judge_rating, judge_feedback }` shape and thresholds
  - When `challenge_id` present, attempts are written; when not, none are written
- API tests
  - Console CRUD happy paths and permissions
  - Web endpoints list/details/leaderboard
- Frontend
  - Panel validation, serialization/deserialization of node config
  - Judging panel: model selection, rubric template binding, threshold validation
  - Node palette presence
  - Challenge instructions: Markdown renderer sanitization, link and image handling
  - Theming: verify CSS variable injection, dark/light modes, and fallback to defaults
  - Collections UI: ordering, visibility filtering, collection leaderboard rendering

## Rollout

1. DB migrations: create `challenges`, `challenge_attempts` tables; add judging columns.
2. Backend: models, service, console/web controllers, workflow node, `NodeType` and node mapping registration.
3. Frontend: add block enum, node + panel components (Prompt Challenge, Judging LLM), node palette default, i18n entries.
4. QA: run `make lint`, `make type-check`, and unit tests; `pnpm lint` and tests for web.
5. Documentation: link this design from contributor docs as needed.

## Open Questions / Future Work

- Anti-cheat signals and anomaly detection.
- Custom evaluator/scoring plugin hooks with sandboxing.
- Team competitions and seasons.
- Per-challenge rate limits and cooldowns.

## Notifications

### Events

- `challenge_first_blood`: emitted when the first successful attempt occurs for a challenge
- `challenge_record_beaten`: emitted when a leaderboard record is surpassed under the active scoring strategy
- `team_pairing_completed`: emitted after each Red/Blue pairing is judged with per-team points

### Delivery channels

- In-app (console): add a section in the console UI for challenge events; poll or use server-sent events
- Email (optional): send via existing email task infra (e.g., Celery tasks)
- Webhook (optional): per-tenant webhook endpoint configured in workspace settings to receive challenge events

### Payloads

```json
{
  "event": "challenge_record_beaten",
  "challenge_id": "...",
  "scoring_strategy": "highest_rating",
  "previous_record": { "account_id": "...", "score": 95.2 },
  "new_record": { "account_id": "...", "score": 96.8 },
  "occurred_at": 1730000000000
}
```

Red/Blue pairing example:

```json
{
  "event": "team_pairing_completed",
  "red_blue_challenge_id": "...",
  "pairing_id": "...",
  "attack_submission_id": "...",
  "defense_submission_id": "...",
  "categories": { "CBRNE": true, "SA": false, "SH": true },
  "judge_rating": 8,
  "red_points": 4,
  "blue_points": 2,
  "occurred_at": 1730000000001
}
```

### Triggers in services

- After `record_attempt`, re-evaluate leaderboard head for the challenge against the prior head
- If the head changed and meets trigger criteria, enqueue notification tasks
- Respect player profile preferences (`notify_on_first_blood`, `notify_on_record_beaten`)

### Player-facing feedback

- Immediate feedback comes from node outputs (e.g., `judge_feedback`, `judge_rating`)
- Aggregated notifications (record beaten, first blood) are async and opt-in per player preferences


