> Update after approval: the user approved the four-model review with «ок». These exact GLBs are now registered and integrated; see [current game verification](../../../proof/approved-chassis-models-20260918/REPORT.md). The proposal-only status below describes the earlier preparation stage.

# Demolition v5 — approval-only 3D proposal

This is a real geometric refinement of the v4 chassis, guided by the original approved Demolition concept. It is not installed in the game. No public assets, source materials, item definitions, or original icons were changed.

Changes: a deep circular machine chamber with twelve separate retaining blocks and a lower recessed core; broad continuous curved ceramic armor with thin engineered seams and beveled closed panel edges; two integrated upper socket wells and two outward lower socket wells; taller inset front grilles, rear service exhausts, panel fastener wells, and an exposed buttressed lower structural belt.

The oversized smeared ceramic markings in v4 came from magnifying a 56×56 region of the baked worker atlas across large panels. An initial mirrored-repeat experiment looked patterned and was removed. V5 uses a quieter 24×24 subregion at (264,348) inside the existing ceramic UV window for its large crown faces. All four embedded original canonical PBR images are byte-identical to leg-worker.glb; no replacement textures or tiny physical tiles were created. This produces cleaner ivory panels but does not recreate the source concept's fine chipped surface richness; the source atlas lacks that detail at this scale.

Final core: 32,208 triangles; 2,531,060 bytes (2.41 MiB); 6 materials and 4 canonical textures. Exact duplicate vertex indexing saves space without changing appearance. Model ID ends in -v3 to preserve the existing no-auto-head behavior.

Validation: finite accessors; closed main hull with 0 nonmanifold edges and 0 degenerate hull triangles; canonical PBR image hashes preserved. Actual assembly generated through equipmentLayout, fittedModel, createCreatureFrame and mountOrgan: 3 arms, 4 legs, 3 organs; structural fit passed and no head added. This is an offline assembly render, not a claim of live gameplay validation. The assembled view intentionally shows actual current attachment placement, including organs over the center.

Outputs: body-demolition-astra5-v3.glb; demolition-assembled.glb; demolition-game-camera.png; demolition-assembly.png; metrics.json; geometry-audit.json; mount-checks.json. Renderer retains the same v4 camera, light setup and 900×900 output, permitting direct geometric comparison.
