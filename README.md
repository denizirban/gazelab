# Gaze Lab — 9-point experimental gaze test

Web-only V0.1 for iPhone Safari. Built as a static site (index.html + app.js), **no Expo, no Xcode, no server backend**.

## What it does

1. Requests front camera access and runs Google's MediaPipe Face Landmarker locally on video frames.
2. Derives a coarse eye-relative iris feature from both eyes. **Not a pupil diameter measurement**.
3. Shows a 3 × 3 calibration grid (nine points), recording short median feature samples while the user fixates each target.
4. Fits a regularized affine mapping from camera features to screen target coordinates.
5. Measures **five separate test targets not used in calibration**. Reports median error in CSS pixels and as a percentage of the board diagonal.
6. Shows a live approximate cursor and allows downloading a local JSON of aggregate measurement data; camera images are never sent to a server.

## Deploy to Vercel

Import https://github.com/denizirban/gazelab as a project, using **Other** framework preset, root directory ./, **no build command**, output directory ./ or leave default for static HTML. Then open the HTTPS deployment URL in iPhone Safari. Camera permission requires HTTPS (or localhost for local development). An internet connection is required to download MediaPipe libraries/model when loading the application.

## Important limitations

The landmarks are for a **rough exploratory gaze estimator**. iPhone Safari cannot use native ARKit gaze APIs; this web test uses MediaPipe iris/face landmarks, not TrueDepth gaze tracking. Head movements, eyelid shape, device position, lighting, screen orientation and model processing rate all affect accuracy. Do not infer intelligence, cognitive state or clinical conditions. Sample size of 5 holdout points is too small for scientific validation. Compare against a reference eye tracker before claiming instrument validity.

The prototype performs **no image uploads**. It does fetch third-party JS/WASM and the public model on initialization. Review privacy and licensing before wider distribution.

## Experimental test protocol

Keep the phone stable at eye level around 30–45 cm from the face in even light; avoid reflections. Run three complete rounds without moving the device, then repeat in different lighting while recording the self-reported lighting condition. Retest independently on multiple devices if possible. Download JSON after each round.

Based on the [MediaPipe Face Landmarker web API](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js).