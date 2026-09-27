> Update after approval: the user approved the four-model review with «ок». These exact GLBs are now registered and integrated; see [current game verification](../../../proof/approved-chassis-models-20260918/REPORT.md). The proposal-only status below describes the earlier preparation stage.

# Assembler — Astra approval-only 3D refinement

Actual geometry based on the approved concepts-v3/assembler-concept-v3.png and existing v4 generator. No src/public assets, existing variants, item definitions, shared material sources or original icons changed.

Two continuous curved ceramic shoulders with closed rounded front ends bound a deep rectangular machine bed. The bed has independent walls, twin rails, raised mechanical clamp bodies, brass axles and a segmented low deck. A curved front ceramic bridge wraps down around an outward recessed mechanical socket. Five stepped rear cassettes have fitted ceramic lids, recessed vent faces and hinge axles. Side sockets have real rings and dark cavity floors set beyond the armor so ceramic never crosses their interiors. Shoulder panels have beveled edges, inset vents and local fasteners; there are no oval cover badges.

All 4 canonical PBR image payloads are unchanged from leg-worker.glb. Large ceramic pieces use the calm 24×24 subcrop at (264,348), within the approved ceramic surface region, to avoid v4's oversized blurred marbling. This remains a cleaner surface than the heavily chipped original concept; the existing small atlas cannot reproduce its microdetail without new authored surface work. No new texture, atlas replacement, microscopic tile geometry or generated raster was used.

Final core: 27,900 triangles; 2,386,572 bytes (2.28 MiB); 4 materials, 4 textures. Exact vertex indexing reduces storage without altering the shape. Model ID body-assembler-astra5-v3 preserves the no-auto-head rule.

Geometry audit: finite accessors, 0 nonmanifold main-hull edges, 0 degenerate main-hull triangles, and byte-identical canonical PBR images. The structural hull remains closed around its mounting origin beneath the bed. Assembly generated successfully through equipmentLayout, fittedModel, createCreatureFrame.fit and mountOrgan using 3 arms (arc, arc, pistol), 3 legs, 5 organs. The model is an offline proposal, not live-game validation; assembled view shows actual current organ placement in the machine bed.

Blender output uses v4's camera, light setup and 900×900 resolution: assembler-game-camera.png and assembler-assembly.png. Both were visually inspected, including the closed front shoulders, bed, socket wells and assembled placement.
