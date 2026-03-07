export type MethodCategory =
  | 'prioritization'
  | 'discovery'
  | 'planning'
  | 'documentation'
  | 'metrics';

export type MethodologyId =
  | 'rice'
  | 'ice'
  | 'wsjf'
  | 'moscow'
  | 'kano'
  | 'value_effort'
  | 'opportunity_scoring'
  | 'buy_a_feature'
  | 'jtbd'
  | 'design_thinking'
  | 'double_diamond'
  | 'lean_experimentation'
  | 'five_whys'
  | 'problem_framing_canvas'
  | 'scrum'
  | 'kanban'
  | 'scrumban'
  | 'sprint_planning'
  | 'story_mapping'
  | 'waterfall'
  | 'critical_path'
  | 'raid'
  | 'prfaq'
  | 'rfc'
  | 'brd_prd_mapping'
  | 'raci'
  | 'okr_alignment'
  | 'aarrr'
  | 'heart'
  | 'north_star_metric';

export type MethodologyDefinition = {
  id: MethodologyId;
  name: string;
  category: MethodCategory;
  inputs_required: string[];
  output_contract: string[];
  applicability_rules: string[];
  conflicts_with: MethodologyId[];
  supports_feature_stage: Array<'pre-launch' | 'beta' | 'growth' | 'scale' | 'any'>;
  deprecated: boolean;
};

export type MethodologyRequest = {
  mode?: 'auto' | 'manual';
  primary?: MethodologyId;
  supporting?: MethodologyId[];
  exclude?: MethodologyId[];
};

export type MethodologySelection = {
  primary: MethodologyId;
  supporting: MethodologyId[];
  selection_reason: string;
  warnings: string[];
  missing_inputs: string[];
};

export type MethodologyRunRecord = {
  workspace_id: string;
  prompt_run_id: string | null;
  primary_method: MethodologyId;
  supporting_methods: MethodologyId[];
  selection_reason: string;
  score_payload: Record<string, unknown>;
};
