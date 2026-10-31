# Irispectra open-data research track

This repository maintains a source-verified discovery registry at [datasets.json](./datasets.json). **The data are not yet imported, analyzed or used to train the browser tracker.** This inventory is selective, not an exhaustive list of all Parkinson and eye-tracking studies.

## Research questions
1. Which published PD-versus-control eye movement features replicate across cohorts and tasks?
2. Which gaze features withstand downsampling, dropout, calibration drift and front-camera noise?
3. Can a smartphone task capture a repeatable *same-task* feature when benchmarked against a reference eye tracker? A successful browser demo is not evidence for early detection.

## Data extraction and harmonization requirements
Capture: dataset DOI/version, license, permissions, unit of observation, participant ID, session ID, age, sex (if supplied), PD state/severity/medication condition (if supplied), task instructions, stimulus onset timestamps, sampling rate, calibration, missingness, gaze X/Y units and reference frame, fixation and saccade event parsing method, pupil measures when recorded.

Do not pool or concatenate unrelated tasks as if they were the same experiment. The Riga multimodal and coordinate datasets may refer to overlapping subjects, so deduplicate before any cross-validation. GazeBase contains younger non-PD participants and must not be described as an age-matched Parkinson control group. TMT-PD is a Trail Making Test dataset, **not** an anti-saccade dataset. ET_PD_VIS provides only visualizations; never infer raw temporal trajectories from these images. PPMI does not automatically supply eye-tracking data.

## Proposed staged analysis
- Phase 0: Download a small public event-level PD dataset and inspect provenance, columns, missingness, permissions and participant-level identifiers.
- Phase 1: Reproduce descriptive PD versus control comparisons using TMT-PD, participant-level bootstrap confidence intervals, and multiple-testing control. Prespecify feature hypotheses and adjust for confounding where metadata permit.
- Phase 2: Use Riga coordinate data to analyze task-specific timing and gaze features. Do not assume TMT and grouping tasks are directly comparable.
- Phase 3: Use GazeBase raw gaze to benchmark fixation/saccade parsing and simulated smartphone low-rate measurement; keep this separate from disease inference.
- Phase 4: Evaluate smartphone-vs-reference concurrent recordings on identical tasks with blinded test sessions; report test–retest repeatability, failure-to-track, and agreement before considering disease-related claims.
- Phase 5: If compatible clinical cohorts exist, conduct participant-grouped external validation. Report confidence intervals, calibration, specificity and site/device generalization; avoid random trial-level train/test splits.

## Data safeguards
Keep source files outside the public Vercel site or public GitHub repository, especially participant-level files. Do not deploy sensitive or controlled-access data. Store only aggregated and permission-compatible research reports in the public site. Cite source DOIs and respect per-dataset terms.

## Current browser experiment
The Anti-Saccade Lab records local Face Landmarker coordinates and JSON export. Its reported gaze-direction classes and frame-time estimates are not yet validated as oculomotor measurements. No Parkinson classifier is trained or deployed here.
