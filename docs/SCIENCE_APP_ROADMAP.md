# Science-Based Bodybuilding App Roadmap

## Goal
Deliver a complete evidence-based hypertrophy platform with elite programming, autoregulation, athlete tools, and coach workflows.

## Phase 1 (Now Implemented)
- Persistent onboarding completion
- Persistent custom exercise creation
- Persistent workout log save flow
- Persistent weekly check-in submit flow
- Readiness scoring engine (sleep/stress/fatigue/soreness/motivation)
- Muscle-level volume recommendation engine (increase/hold/reduce/deload)
- Dashboard intelligence section with next-week set targets
- Progress timeframe filters (week/month/all) and dynamic chart buckets

## Phase 2 (Programming Engine)
- Mesocycle planner from MEV to MRV by muscle group
- Weekly autoregulation using readiness + performance trend
- Deload detection rules and automatic deload week generation
- Exercise progression models:
  - double progression
  - top-set + backoff
  - rep-goal progression
  - load wave progression
- Fatigue budgeting per session and per week

## Phase 3 (Athlete Tools)
- Session optimizer (exercise order, estimated duration)
- Rest-time intelligence and timer auto-adjust
- Technique and RIR calibration prompts
- Lift velocity / bar speed optional integrations
- PR detection: e1RM, reps, volume PRs
- Weak point analyzer and priority adjustments

## Phase 4 (Analytics)
- Volume-response trend by muscle
- Stimulus-to-fatigue score per exercise and session
- Plateau and recovery debt detection
- Compliance analytics and trend segmentation
- Injury-risk proxy scoring based on patterns

## Phase 5 (Nutrition + Recovery)
- Macro targets by phase (gain/cut/maintain)
- Rate-of-gain tracking and adjustments
- Sleep recovery trend dashboard
- Cardio-fatigue integration with lifting volume

## Phase 6 (Coach + Platform)
- Multi-athlete coach dashboard
- Plan approvals and comments per day/session
- Shared notes and video feedback slots
- Notification/automation rules for low readiness or misses
- Role-based permissions and audit trail

## Phase 7 (Data + Reliability)
- Full Base44 backend integration for all entities
- Offline-first sync queue and conflict resolution
- Test suite for progression engine math and API flows
- Error monitoring and event analytics
- Data export/import

## Feature Inventory (All Requested)
1. Real progression engine (MEV->MRV)
2. Fatigue-adjusted programming
3. Exercise progression rules
4. Program builder v2
5. Session optimizer
6. Workout quality scoring
7. Readiness dashboard
8. Advanced analytics
9. RIR calibration tools
10. Nutrition integration
11. Exercise library pro
12. PR + milestone system
13. Coach mode
14. Data/infra hardening
15. Testing + reliability
16. UX power tools
17. Periodization blocks
18. Injury/pain-aware adjustments

## Delivery Strategy
- Keep each phase behind feature flags.
- Validate progression math in tests before exposing in UI.
- Prioritize athlete-safe defaults over aggressive progression.
