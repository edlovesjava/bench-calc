export type Unit = string;

export interface VarMeta {
  unit: Unit;
  label: string;
  default?: string;
  domain?: [number, number];
  series?: boolean;
  presets?: { label: string; value: string }[];
  kind?: 'mode';
  options?: string[];
}

export interface DerivedItem {
  id: string;
  unit: Unit;
  expr: string;
  label: string;
}

export interface OutputItem {
  id: string;
  unit: Unit;
  label: string;
}

export interface CheckDefinition {
  when: string;
  level: 'warn' | 'fail';
  text: string;
}

export interface TriggeredCheck extends CheckDefinition {
  triggered: true;
}

export interface TraceStep {
  label: string;
  expr: string;
  substituted: string;
  value: number;
  unit: Unit;
}

export interface FieldError {
  name: string;
  message: string;
}

export interface Adjustment {
  id: string;
  target: string;
  label: string;
  modes: string[];
}

export interface CalculatorDefinition {
  id: string;
  kind?: 'procedure';
  group: string;
  title: string;
  blurb: string;
  vars: Record<string, VarMeta>;
  relation?: string;
  solveFor?: string;
  closedForm?: Record<string, string>;
  derived?: DerivedItem[];
  outputs?: OutputItem[];
  run?: (values: Record<string, string | number>) => Record<string, number>;
  checks?: CheckDefinition[];
  adjustments?: Adjustment[];
  symbols?: Record<string, string>;
  datasheet?: string[];
  examples: { given: Record<string, number | string>; expect: Record<string, number> }[];
}

export interface RunResult {
  definition: CalculatorDefinition;
  values: Record<string, number | string>;
  derived: Record<string, number>;
  relation: string | null;
  target: string | null;
  checks: TriggeredCheck[];
  trace: TraceStep[];
  fieldErrors: FieldError[];
  valid: boolean;
}
