export function executeEvidenceBasedSimulation(params: {
  simulation?: any;
  sim?: any;
  personas?: any[];
  allPersonas?: any[];
  enableWebSearch?: boolean;
  fastDeterministic?: boolean;
  maxExecutionMs?: number;
  existingWebResearch?: any;
  existingTimesfmForecast?: any;
  onStageChange?: (stage: string) => void;
}): Promise<{
  results: any;
  researchBundle: any;
}>;

export function handleSimulationRunRequest(req: any, res: any): Promise<any>;
