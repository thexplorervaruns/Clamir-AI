import { Persona, Simulation, SimulationResults } from '../types/clamir.ts';

export declare function runDirectSimulation(params: {
  simulation: Partial<Simulation>;
  personas?: Persona[];
  authToken?: string;
}): Promise<SimulationResults>;
