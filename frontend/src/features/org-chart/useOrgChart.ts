import { useEffect, useMemo, useState } from 'react';

import { fetchOrgChart, OrgChartNode, OrgChartResponse } from '@/lib/api/org-chart';
import { QueryState } from '@/lib/api/query-state';

interface OrgChartState extends QueryState<OrgChartResponse> {
  visibleRoots: OrgChartNode[];
}

function filterTree(nodes: OrgChartNode[], search: string): OrgChartNode[] {
  if (!search) {
    return nodes;
  }

  const normalized = search.toLowerCase();

  return nodes
    .map((node) => {
      const children = filterTree(node.children, search);
      const nodeMatches = [
        node.name,
        node.code,
        node.kind,
        node.manager?.displayName ?? '',
        ...node.members.map((member) => member.displayName),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);

      if (!nodeMatches && children.length === 0) {
        return null;
      }

      return {
        ...node,
        children,
      };
    })
    .filter((node): node is OrgChartNode => node !== null);
}

export function useOrgChart(search: string): OrgChartState {
  const [state, setState] = useState<QueryState<OrgChartResponse>>({
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchOrgChart()
      .then((data) => {
        if (!active) {
          return;
        }

        setState({ data, isLoading: false });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : 'Failed to load org chart.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleRoots = useMemo(
    () => filterTree(state.data?.roots ?? [], search.trim()),
    [search, state.data?.roots],
  );

  return {
    ...state,
    visibleRoots,
  };
}
