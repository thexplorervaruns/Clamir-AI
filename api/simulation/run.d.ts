export function executeEvidenceBasedSimulation(params: {
  simulation: any;
  personas: any[];
  onStageChange?: (stage: string) => void;
}): Promise<{
  results: any;
  researchBundle: any;
}>;

export function handleSimulationRunRequest(req: any, res: any): Promise<any>;
