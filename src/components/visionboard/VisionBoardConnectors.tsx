import type { VisionBoardElement } from '../../domain/models/AppData';
import { connectorEndpoints, curvedPath } from '../../lib/visionBoardConnectors';

interface VisionBoardConnectorsProps {
  connectors: VisionBoardElement[];
  elements: VisionBoardElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VisionBoardConnectors({
  connectors,
  elements,
  selectedId,
  onSelect,
}: VisionBoardConnectorsProps) {
  if (connectors.length === 0) return null;

  return (
    <svg className="ll-vb-connectors" aria-hidden>
      <defs>
        <marker
          id="ll-vb-arrow-straight"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
        </marker>
        <marker
          id="ll-vb-arrow-curved"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
        </marker>
      </defs>
      {connectors.map((connector) => {
        const { x1, y1, x2, y2 } = connectorEndpoints(connector, elements);
        const color = connector.stroke ?? '#a78bfa';
        const width = connector.strokeWidth ?? 2;
        const curved = connector.connectorStyle === 'curved';
        const d = curved ? curvedPath(x1, y1, x2, y2) : `M ${x1} ${y1} L ${x2} ${y2}`;
        return (
          <g
            key={connector.id}
            className={`ll-vb-connector${selectedId === connector.id ? ' selected' : ''}`}
            style={{ color }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelect(connector.id);
            }}
          >
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={width}
              markerEnd={`url(#ll-vb-arrow-${curved ? 'curved' : 'straight'})`}
            />
          </g>
        );
      })}
    </svg>
  );
}
