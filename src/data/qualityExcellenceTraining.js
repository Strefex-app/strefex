/**
 * Short practitioner bullets for each Quality Excellence tool.
 * Source: Complete Quality Tools Practitioner Toolkit (30 tools).
 */

export const QUALITY_TRAINING = {
  't1-5-whys': [
    'Use first on every quality project — before any solution.',
    'Write a factual problem (date, quantity, machine, shift, defect). No blame.',
    'Ask Why until a systemic failure (WI, process, design) — not a person.',
    'Every answer needs physical evidence. No evidence → collect data, do not guess.',
    '“Human error” is a symptom. Keep asking why the system allowed it.',
    'Type in the Why windows. Enter jumps to the next field. Lock the root cause at the bottom.',
  ],
  't2-ishikawa': [
    'Use when the root cause is unknown — map all 6M before a single 5 Whys chain.',
    'Include the operator who ran the process. Bring the part and records.',
    'Silent generation, then post onto Man / Machine / Method / Material / Measurement / Environment.',
    'Dot-vote, assign investigation, mark ruled out or confirmed with evidence.',
    'The fishbone is a hypothesis map, not the answer.',
    'Click a bone to focus that window. The diagram updates as you add causes.',
  ],
  't3-pdca': [
    'Use as the cycle around every improvement (5 Whys, 8D, DOE, kaizen).',
    'PLAN must include a numeric prediction. Do not start Do without it.',
    'DO: pilot exactly as defined. Document every deviation.',
    'CHECK against the prediction, not only the baseline.',
    'ACT: update the WI and train — or revise the Plan. Skipping Act brings the problem back.',
    'The PDCA figure lights each phase as you fill it. Enter jumps between fields.',
  ],
  't4-8d': [
    'Use when an escape reached the customer (IATF / AS9100 / Tier 1). D0 within 24 hours.',
    'D0–D3: contain inventory, named team, IS / IS NOT description.',
    'D4: evidence-verified root cause of the defect AND of detection failing.',
    'D5–D6: permanent action + Cpk ≥ 1.33. D7: update FMEA, control plan, WI.',
    'Sorting is not corrective action. Do not send the 8D before D4 is verified.',
    'Work D0–D8 in the stepper. Fill IS / IS NOT. Status drives the figure.',
  ],
  't5-a3': [
    'One-page story: background, current condition, SMART goal, cause, actions, results, sustain.',
    'If it will not fit on one page, the thinking is not clear yet.',
    'Only confirmed root causes. One action per cause with Who / When.',
    'Prefer charts over paragraphs. Do not skip Results.',
    'Fill the windows. The storyboard on the left updates from your text.',
  ],
  't6-pareto': [
    'Use after the problem is defined — find the vital few by cost, not count.',
    'Need ~20 days of defect type, quantity, and cost (COPQ if possible).',
    'Sort descending by cost. Vital few ≈ 80% of loss.',
    'Normalise machines by volume. Pareto shows WHERE; 5 Whys shows WHY.',
    'Enter name, count, cost. % and the chart calculate. Paste Excel/CSV if you have it.',
  ],
  't7-spc': [
    'Use to see if the process is in control. Do not claim Cpk until special causes are assigned.',
    'Xbar-R (n = 2–9), I-MR (n = 1), p / np for attributes.',
    'Control limits come from data, not from the drawing.',
    'Signals: 1 beyond ±3σ, 8 on one side of CL, 6 trending, 2 of 3 beyond ±2σ.',
    'Do not tamper after every reading. Recalculate limits only after assignable causes are gone.',
    'Enter sample values. UCL / CL / LCL and the chart update. Assign every OOC point.',
  ],
  't8-gage-rr': [
    'Validate the gauge before any Cpk or SPC. Measurement noise makes later studies wrong.',
    'Study: 10 parts × 3 typical operators × 2 trials, parts coded blind.',
    '%GRR < 10% OK; 10–30% conditional with a plan; ≥ 30% reject. ndc < 5 cannot discriminate.',
    'Do not test only the best operator. Randomise trial order.',
    'Type EV, AV, PV. %GRR, ndc, and verdict update on the gauge.',
  ],
  't9-cpk-ppk': [
    'Cpk = short-term; Ppk = long-term (PPAP and Stage 6). Ppk ≤ Cpk.',
    'Use a normal production run, not a watched trial. Process must be in control.',
    'Ppk < 1.00: 100% inspect. 1.33–1.67: IATF special-characteristic minimum. ≥ 1.67: later simplification.',
    'PPAP needs Ppk, not a 30-piece Cpk. Empty readings are not zero.',
    'Enter LSL, USL, and readings. Histogram and indexes calculate. Enter on the last cell adds a row.',
  ],
  't10-fmea': [
    'Use before a problem (new process / IATF PFMEA) and after 8D to capture detection failure.',
    'One row per failure mode. RPN = S × O × D. Never lower S because a control detects it.',
    'RPN ≥ 200: act now. Also watch high Severity even if RPN is low (AIAG-VDA AP).',
    'Update when the process changes or an action is implemented.',
    'Enter S, O, D. RPN and the ranking chart calculate. Paste a PFMEA extract if you have one.',
  ],
  't11-fta': [
    'Use for combinatorial failures (safety / liability). 5 Whys for a single chain; Ishikawa if the category is unknown.',
    'Define a precise top event. AND = all must occur; OR = any one is enough. Do not invert them.',
    'Link events with parent IDs down to basic events. Verify each branch with evidence.',
    'Set the top event, then ID / gate / parent. The tree draws from those links.',
  ],
  't12-tolerance': [
    'Use to right-size non-critical stacks. Never RSS on safety-critical dimensions.',
    'Compare worst-case and RSS to the assembly requirement.',
    'Confirm Ppk before widening a drawing tolerance. Issue an ECO and update the control plan.',
    'Enter requirement and component ±. Bars update. Mark contributor yes/no.',
  ],
  't13-poka-yoke': [
    'Use after root cause is confirmed — prevent the error, do not add inspection.',
    'Level 1 (physically impossible) over Level 2 (stop at mistake) over Level 3 (detect later).',
    'Test ≥ 30 intentional error cycles. Do not validate only on good parts.',
    'Choose prevention / detection / warning. The shield highlights the type.',
  ],
  't14-doe': [
    'Use when interactions matter. Do not change one factor at a time (OFAT).',
    'Set factors low (−) / high (+). Randomise run order. Record the response.',
    'Confirmation run is mandatory — the DOE predicts, the process must verify.',
    'Fill factors and runs. Response bars plot. Paste Excel; Enter on the last cell adds a row.',
  ],
  't15-vsm': [
    'Walk the floor — do not map from a desk. Deliverable is future state + actions, not a pretty current map.',
    'Record step, cycle, wait, VA / NVA, waste.',
    'Name the wastes removed and an action per NVA step.',
    'Fill steps with VA / NVA. The flow colours NVA red and VA green.',
  ],
  't16-smed': [
    'Target ≥ 50% changeover cut. Capture free gains before buying equipment.',
    'Separate internal vs external, then convert internal to external, then streamline the rest.',
    'Lock standard work and a changeover KPI or the gain decays.',
    'Enter baseline / target and element minutes. Actual, % reduced, and bars calculate.',
  ],
  't17-tpm-oee': [
    'OEE = A × P × Q. Daily action tool, not a monthly report.',
    'Log the six big losses. Act on the largest bar. Prefer event-level data over shift totals.',
    'Type A, P, Q. OEE and loss bars update. Paste a loss log if you have one.',
  ],
  't18-control-plan': [
    'One row per CTQ: spec, method/gauge, sample, reaction the operator can execute.',
    'Reaction must be specific — not “inform supervisor”. Align steps with the PFMEA.',
    'Every production gauge in calibration. Update after process change.',
    'Add CTQ rows. Use More fields for spec, method, sample, and reaction.',
  ],
  't19-lpa': [
    'L1 supervisor daily, L2 engineer weekly, L3 manager monthly. Observe records — do not only ask.',
    'Close every finding. Zero findings is not a reason to cut frequency (see T26).',
    'Set the layer. Enter pass / fail. Score % and bars update.',
  ],
  't20-kpi-dashboard': [
    'If status is not obvious in 5 seconds, the design failed. Max 6–10 metrics.',
    'Mix lagging (PPM, scrap) with 2–3 leading (% in control, LPA on time).',
    'Each KPI: owner, target, actual, reaction rule. Shop floor, not a weekly office printout.',
    'Enter name, target, actual. The board and bars compare when both are numeric.',
  ],
  't21-frequency-reduction': [
    'Reduce sampling only with Ppk, months stable, and escape history — plus a reversion trigger.',
    'Keep SPC on. Special characteristics need written customer approval.',
    'Enter Ppk and current vs proposed counts. % reduced and the before/after figure update. Capture both sign-offs.',
  ],
  't22-skip-lot': [
    'Replace 100% with Z1.4 / AQL when lot history justifies it. Not for safety characteristics.',
    'AQL is sampling protection, not a defect target. Tighten if 2 of 5 lots fail — mandatory.',
    'Enter lot size, AQL, level. n, Ac, Re calculate. Funnel shows lot → sample → Ac/Re.',
  ],
  't23-inspection-matrix': [
    'Audit every inspection: cost, decision value, keep / merge / remove.',
    'Simplify only if Ppk ≥ 1.67, ≥ 12 months stable, zero escapes in 24 months, not safety.',
    'High Ppk plus a recent escape = review, not simplify. Set an annual review date.',
    'Enter inspections and action. The matrix counts keep / merge / remove.',
  ],
  't24-cp-rightsizing': [
    'Drop rows only with FMEA RPN and Ppk evidence. Customer specials: never remove unilaterally.',
    'Update FMEA Detection if a row is removed. Do not right-size during a process change.',
    'Mark each row keep / merge / remove. The matrix counts the outcome.',
  ],
  't25-gauge-rationalisation': [
    'Retire gauges not on any active control plan. Match the gauge list to the control plan first.',
    'Extend calibration only after 6+ consecutive passes.',
    'Enter each gauge and keep / extend / retire. The inventory figure counts actions.',
  ],
  't26-lpa-rightsizing': [
    'Match LPA frequency to stability. Pilot 2–3 stable lines first — do not cut every line at once.',
    'Publish the escalation trigger. Reduce only where pass rate is proven and findings close.',
    'Enter pass rate and current vs proposed counts. % reduced updates. Capture sign-off.',
  ],
  't27-supplier-rightsizing': [
    'Advance on PPM, Ppk, and complaints — not time in grade.',
    'Dock-to-stock / skip-lot only with quantified history. Keep COC and lot traceability.',
    'Enter PPM, Ppk, complaints. Routing and suggested action fill from the data.',
  ],
  't28-simplification-register': [
    'One register for all Stage 6 actions: current cost, simplified cost, saving, status.',
    'Count only implemented savings. Keep in step with T30 COQ.',
    'Enter item and costs. Saving bars update. Paste a cost extract if you have one.',
  ],
  't29-apqp': [
    'New product / process launch: DFMEA, PFMEA, control plan, Gage R&R, capability, then PPAP.',
    'Capability: ≥ 100 consecutive production parts at normal rate — not a watched 30-piece trial.',
    'Do not submit PPAP before Gage R&R. PPAP is the start of production, not the finish.',
    'Gate each phase with owner, due, status, and evidence. The stepper shows progress.',
  ],
  't30-coq': [
    'Four buckets: prevention, appraisal, internal failure, external failure.',
    'Prevention/appraisal are investments; failure is loss. Do not cut prevention to “save COQ”.',
    'External failure is often 3–10× internal scrap. Refresh after Stage 6 simplification.',
    'Enter bucket, item, amount. Pie and bars calculate. Paste a finance extract into the pad.',
  ],
}

export function getQualityTraining(toolId) {
  const bullets = QUALITY_TRAINING[toolId]
  return bullets?.length ? { bullets } : null
}
