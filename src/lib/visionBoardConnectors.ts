import type { VisionBoardAnchor, VisionBoardElement } from '../domain/models/AppData';

export function anchorPoint(
  element: VisionBoardElement,
  anchor: VisionBoardAnchor = 'center',
): { x: number; y: number } {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  switch (anchor) {
    case 'n':
      return { x: cx, y: element.y };
    case 's':
      return { x: cx, y: element.y + element.height };
    case 'e':
      return { x: element.x + element.width, y: cy };
    case 'w':
      return { x: element.x, y: cy };
    default:
      return { x: cx, y: cy };
  }
}

export function findElementAtPoint(
  elements: VisionBoardElement[],
  x: number,
  y: number,
): VisionBoardElement | undefined {
  return [...elements]
    .filter((el) => el.type !== 'connector')
    .sort((a, b) => b.zIndex - a.zIndex)
    .find(
      (el) => x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height,
    );
}

export function connectorEndpoints(
  connector: VisionBoardElement,
  elements: VisionBoardElement[],
): { x1: number; y1: number; x2: number; y2: number } {
  const fromEl = connector.connectorFromId
    ? elements.find((e) => e.id === connector.connectorFromId)
    : undefined;
  const toEl = connector.connectorToId
    ? elements.find((e) => e.id === connector.connectorToId)
    : undefined;

  const start = fromEl
    ? anchorPoint(fromEl, connector.fromAnchor ?? 'center')
    : { x: connector.x, y: connector.y };

  const end = toEl
    ? anchorPoint(toEl, connector.toAnchor ?? 'center')
    : { x: connector.endX ?? connector.x + connector.width, y: connector.endY ?? connector.y + connector.height };

  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

export function curvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * 0.25;
  const cy = my + dx * 0.25;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
