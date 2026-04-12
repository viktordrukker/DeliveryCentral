import { useState } from 'react';
import { Link } from 'react-router-dom';

import { OrgChartNode } from '@/lib/api/org-chart';
import { ORG_UNIT_TYPE_LABELS, humanizeEnum } from '@/lib/labels';

interface OrgChartTreeProps {
  nodes: OrgChartNode[];
}

export function OrgChartTree({ nodes }: OrgChartTreeProps): JSX.Element {
  return (
    <div className="org-tree">
      {nodes.map((node) => (
        <OrgChartTreeNode key={node.id} node={node} />
      ))}
    </div>
  );
}

function OrgChartTreeNode({ node }: { node: OrgChartNode }): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="org-tree__node">
      <div className="org-tree__card">
        <div className="org-tree__header">
          <div>
            <div className="org-tree__title">{node.name}</div>
            <div className="org-tree__meta">{node.code} · {humanizeEnum(node.kind, ORG_UNIT_TYPE_LABELS)}</div>
          </div>
          {hasChildren ? (
            <button
              className="button button--secondary"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          ) : null}
        </div>

        <dl className="details-list">
          <div>
            <dt>Manager</dt>
            <dd>{node.manager?.displayName ?? 'No assigned manager'}</dd>
          </div>
          <div>
            <dt>Members</dt>
            <dd>{node.members.length}</dd>
          </div>
        </dl>

        {node.members.length > 0 ? (
          <div className="org-tree__members">
            {node.members.map((member) => (
              <div className="org-tree__member" key={member.id}>
                <div>
                  <div className="org-tree__member-name">{member.displayName}</div>
                  <div className="org-tree__member-meta">
                    {member.lineManagerName ?? 'No line manager'}
                  </div>
                </div>
                <Link className="button button--secondary" to={`/people/${member.id}`}>
                  View person
                </Link>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {expanded && hasChildren ? (
        <div className="org-tree__children">
          {node.children.map((child) => (
            <OrgChartTreeNode key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
