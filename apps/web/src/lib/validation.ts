import { createContext, useContext } from 'react';

export {
  computeIssues,
  type ValidationIssue,
} from '@drawzware/domain';


/** Node ids with a warning-level issue; Canvas provides it, nodes read it for the badge. */
export const ValidationWarningsContext = createContext<ReadonlySet<string>>(new Set());

export function useHasValidationWarning(nodeId: string) {
  return useContext(ValidationWarningsContext).has(nodeId);
}
