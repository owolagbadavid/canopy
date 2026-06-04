/**
 * Bundled fallback shown (labelled `source: "sample"`) when the 5/mo tree-analysis
 * quota is exhausted, so a reviewer always sees a realistic result. Shape matches
 * the upstream /v1/trees/analyze response so it flows through the same adapter.
 */
export const SAMPLE_TREE_ANALYSIS = {
  analysis_id: "sample-orchard-0001",
  timestamp: "2026-06-01T09:30:00Z",
  total_tree_count: 184,
  tree_density_per_acre: 92,
  confidence_score: 0.87,
  canopy_coverage_pct: 63.4,
  tree_health: {
    healthy: 152,
    needs_care: 24,
    needs_replacement: 8,
  },
  low_confidence: false,
  gemini_error: null,
  observations: [
    "Canopy coverage is dense in the north-west block with visible crown overlap.",
    "A cluster of stressed crowns detected along the south edge, consistent with water stress.",
    "8 gaps identified where trees appear missing or dead.",
  ],
  recommendations: [
    "Prioritise irrigation inspection on the south edge to address early water stress.",
    "Replant the 8 identified gaps to restore stand density toward the 100/acre target.",
    "Schedule pruning in the north-west block to reduce crown overlap and improve light penetration.",
  ],
  overlay_image_url: "/samples/orchard-overlay.svg",
  original_image_url: "/samples/orchard-original.svg",
};
