declare module 'd3-org-chart' {
  export class OrgChart<TDatum = Record<string, unknown>> {
    constructor();
    container(selector: string): this;
    data(data: TDatum[]): this;
    nodeWidth(cb: (d: TDatum) => number): this;
    nodeHeight(cb: (d: TDatum) => number): this;
    nodeId(cb: (d: TDatum) => string): this;
    parentNodeId(cb: (d: TDatum) => string | null): this;
    nodeContent(cb: (d: { data: TDatum; width: number; height: number }) => string): this;
    onNodeClick(cb: (d: TDatum) => void): this;
    compact(val: boolean): this;
    fit(): this;
    render(): this;
    expandAll(): this;
    collapseAll(): this;
    zoomIn(): this;
    zoomOut(): this;
    exportImg(options?: { full?: boolean; save?: boolean }): this;
    svgHeight(val: number): this;
    svgWidth(val: number): this;
    initialZoom(val: number): this;
    setExpanded(id: string, expanded?: boolean): this;
    setCentered(id: string): this;
    duration(val: number): this;
    connections(val: Array<{ from: string; to: string; label?: string }>): this;
    connectionsUpdate(cb: (d: unknown, i: number, arr: unknown[]) => void): this;
    layout(val: 'top' | 'bottom' | 'left' | 'right'): this;
    /** Re-render the chart with a new dataset, or trigger a refresh by passing
     *  the current `root` node from `getChartState()`. The library is happy to
     *  receive either shape. */
    update(data: TDatum[] | unknown): this;
    /** Returns the internal chart state, including the d3-hierarchy root node.
     *  Undocumented in the upstream README but stable across recent releases —
     *  used to enumerate descendants and trigger structural refreshes. */
    getChartState(): {
      root?: {
        descendants?(): Array<{
          depth: number;
          data: TDatum & { _expanded?: boolean };
        }>;
      };
    };
    /** Removes the window resize listener bound during render() and clears the SVG.
     *  Must be called when navigating away or before recreating the chart, otherwise
     *  the resize listener fires getBoundingClientRect() on a detached container. */
    clear(): this;
  }
}
