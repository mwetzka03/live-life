import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Circle,
  Crop,
  ImagePlus,
  Layers,
  MousePointer2,
  Plus,
  Square,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { VisionBoard, VisionBoardElement } from '../../domain/models/AppData';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';

type Tool = 'select' | 'text' | 'rect' | 'circle' | 'image';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type CropHandle = 'n' | 's' | 'e' | 'w';

type CropInsets = { left: number; top: number; right: number; bottom: number };

const MIN_ELEMENT_SIZE = 24;
const MIN_CROP = 0.05;
const DEFAULT_CROP: CropInsets = { left: 0, top: 0, right: 0, bottom: 0 };
const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CROP_HANDLES: CropHandle[] = ['n', 's', 'e', 'w'];

function hexToRgba(hex: string, opacityPercent: number): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(100, Math.max(0, opacityPercent)) / 100})`;
}

function baseHex(color: string): string {
  const m = color.match(/^#([0-9a-f]{6})/i);
  return m ? `#${m[1]}` : color.slice(0, 7);
}

function normalizeCrop(raw?: CropInsets | { x: number; y: number; w: number; h: number }): CropInsets {
  if (!raw) return DEFAULT_CROP;
  if ('left' in raw) {
    return {
      left: Math.max(0, Math.min(1, raw.left)),
      top: Math.max(0, Math.min(1, raw.top)),
      right: Math.max(0, Math.min(1, raw.right)),
      bottom: Math.max(0, Math.min(1, raw.bottom)),
    };
  }
  const legacy = raw as { x: number; y: number; w: number; h: number };
  return {
    left: Math.max(0, legacy.x),
    top: Math.max(0, legacy.y),
    right: Math.max(0, 1 - legacy.x - legacy.w),
    bottom: Math.max(0, 1 - legacy.y - legacy.h),
  };
}

function imageSourceSize(element: VisionBoardElement): { w: number; h: number } {
  const insets = normalizeCrop(element.imageCrop);
  if (!hasCropInsets(insets)) {
    return { w: element.width, h: element.height };
  }
  return {
    w: element.imageSourceWidth ?? element.width,
    h: element.imageSourceHeight ?? element.height,
  };
}

function fillColor(element: VisionBoardElement): string {
  const hex = baseHex(element.fill ?? '#818cf8');
  const opacity = element.fillOpacity ?? 40;
  return hexToRgba(hex, opacity);
}

function applyResize(
  el: VisionBoardElement,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): VisionBoardElement {
  const prevW = el.width;
  const prevH = el.height;
  let { x, y, width, height } = el;
  if (handle.includes('e')) width = Math.max(MIN_ELEMENT_SIZE, width + dx);
  if (handle.includes('w')) {
    const next = Math.max(MIN_ELEMENT_SIZE, width - dx);
    x += width - next;
    width = next;
  }
  if (handle.includes('s')) height = Math.max(MIN_ELEMENT_SIZE, height + dy);
  if (handle.includes('n')) {
    const next = Math.max(MIN_ELEMENT_SIZE, height - dy);
    y += height - next;
    height = next;
  }

  if (el.type === 'image' && prevW > 0 && prevH > 0) {
    const sw = el.imageSourceWidth ?? prevW;
    const sh = el.imageSourceHeight ?? prevH;
    return {
      ...el,
      x,
      y,
      width,
      height,
      imageSourceWidth: Math.max(MIN_ELEMENT_SIZE, sw * (width / prevW)),
      imageSourceHeight: Math.max(MIN_ELEMENT_SIZE, sh * (height / prevH)),
    };
  }

  return { ...el, x, y, width, height };
}

function captureOriginalImageState(el: VisionBoardElement): Partial<VisionBoardElement> {
  if (el.originalSrc) return {};
  return {
    originalSrc: el.src,
    originalX: el.x,
    originalY: el.y,
    originalWidth: el.width,
    originalHeight: el.height,
    originalImageSourceWidth: el.imageSourceWidth ?? el.width,
    originalImageSourceHeight: el.imageSourceHeight ?? el.height,
  };
}

function restoreOriginalImage(el: VisionBoardElement): VisionBoardElement | null {
  if (!el.originalSrc) return null;
  return {
    ...el,
    src: el.originalSrc,
    x: el.originalX ?? el.x,
    y: el.originalY ?? el.y,
    width: el.originalWidth ?? el.width,
    height: el.originalHeight ?? el.height,
    imageSourceWidth: el.originalImageSourceWidth ?? el.originalWidth ?? el.width,
    imageSourceHeight: el.originalImageSourceHeight ?? el.originalHeight ?? el.height,
    imageCrop: DEFAULT_CROP,
  };
}

function resetCropForElement(el: VisionBoardElement): VisionBoardElement {
  const insets = normalizeCrop(el.imageCrop);
  if (hasCropInsets(insets)) {
    return { ...el, imageCrop: DEFAULT_CROP };
  }
  const restored = restoreOriginalImage(el);
  return restored ?? { ...el, imageCrop: DEFAULT_CROP };
}

function hasCropInsets(insets: CropInsets): boolean {
  return insets.left > 0 || insets.top > 0 || insets.right > 0 || insets.bottom > 0;
}

function frameCropClip(element: VisionBoardElement, insets: CropInsets): string {
  const { w: sw, h: sh } = imageSourceSize(element);
  const fw = element.width;
  const fh = element.height;
  if (fw <= 0 || fh <= 0 || sw <= 0 || sh <= 0) {
    return `inset(${insets.top * 100}% ${insets.right * 100}% ${insets.bottom * 100}% ${insets.left * 100}%)`;
  }
  const top = (insets.top * fh) / sh * 100;
  const right = (insets.right * fw) / sw * 100;
  const bottom = (insets.bottom * fh) / sh * 100;
  const left = (insets.left * fw) / sw * 100;
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}

function bakeCropIntoElement(el: VisionBoardElement): Promise<VisionBoardElement | null> {
  const insets = normalizeCrop(el.imageCrop);
  if (!hasCropInsets(insets) || !el.src) return Promise.resolve(null);

  const { w: sw, h: sh } = imageSourceSize(el);
  const leftPx = insets.left * el.width;
  const topPx = insets.top * el.height;
  const visibleW = Math.max(MIN_ELEMENT_SIZE, el.width * (1 - insets.left - insets.right));
  const visibleH = Math.max(MIN_ELEMENT_SIZE, el.height * (1 - insets.top - insets.bottom));

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scaleX = sw > 0 ? img.naturalWidth / sw : 1;
      const scaleY = sh > 0 ? img.naturalHeight / sh : 1;
      const srcX = leftPx * scaleX;
      const srcY = topPx * scaleY;
      const srcW = visibleW * scaleX;
      const srcH = visibleH * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(visibleW));
      canvas.height = Math.max(1, Math.round(visibleH));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
      resolve({
        ...el,
        ...captureOriginalImageState(el),
        x: el.x + leftPx,
        y: el.y + topPx,
        src: canvas.toDataURL('image/png'),
        width: visibleW,
        height: visibleH,
        imageSourceWidth: visibleW,
        imageSourceHeight: visibleH,
        imageCrop: DEFAULT_CROP,
      });
    };
    img.onerror = () => resolve(null);
    img.src = el.src!;
  });
}

function adjustCrop(
  insets: CropInsets,
  handle: CropHandle,
  dxPx: number,
  dyPx: number,
  elW: number,
  elH: number,
): CropInsets {
  let { left, top, right, bottom } = insets;
  const nx = dxPx / elW;
  const ny = dyPx / elH;
  const maxLeft = 1 - right - MIN_CROP;
  const maxRight = 1 - left - MIN_CROP;
  const maxTop = 1 - bottom - MIN_CROP;
  const maxBottom = 1 - top - MIN_CROP;

  if (handle === 'w') left = Math.max(0, Math.min(maxLeft, left + nx));
  if (handle === 'e') right = Math.max(0, Math.min(maxRight, right - nx));
  if (handle === 'n') top = Math.max(0, Math.min(maxTop, top + ny));
  if (handle === 's') bottom = Math.max(0, Math.min(maxBottom, bottom - ny));

  return { left, top, right, bottom };
}

function canvasPoint(
  clientX: number,
  clientY: number,
  canvasEl: HTMLElement,
  zoom: number,
): { x: number; y: number } {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / zoom,
    y: (clientY - rect.top) / zoom,
  };
}

function isBold(weight?: string): boolean {
  return weight === '700' || weight === 'bold';
}

interface ElementPopoverProps {
  element: VisionBoardElement;
  cropMode: boolean;
  onChange: (el: VisionBoardElement) => void;
  onDelete: () => void;
  onToggleCrop: () => void;
  onResetCrop: () => void;
  t: (key: string) => string;
}

function ElementPopover({
  element,
  cropMode,
  onChange,
  onDelete,
  onToggleCrop,
  onResetCrop,
  t,
}: ElementPopoverProps) {
  return (
    <div className="ll-vb-popover" onMouseDown={(e) => e.stopPropagation()}>
      {element.type === 'text' && (
        <>
          <label className="ll-vb-popover-field">
            <span>{t('visionboard.inspector.fontSize')}</span>
            <input
              type="number"
              min={10}
              max={120}
              value={element.fontSize ?? 22}
              onChange={(e) => onChange({ ...element, fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="ll-vb-popover-field color">
            <span>{t('visionboard.inspector.color')}</span>
            <input
              type="color"
              value={element.color ?? '#ffffff'}
              onChange={(e) => onChange({ ...element, color: e.target.value })}
            />
          </label>
          <div className="ll-vb-format-toggle" role="group" aria-label={t('visionboard.inspector.format')}>
            <button
              type="button"
              className={isBold(element.fontWeight) ? 'active' : ''}
              onClick={() =>
                onChange({
                  ...element,
                  fontWeight: isBold(element.fontWeight) ? '400' : '700',
                })
              }
              title={t('visionboard.inspector.bold')}
            >
              B
            </button>
            <button
              type="button"
              className={`italic${element.fontStyle === 'italic' ? ' active' : ''}`}
              onClick={() =>
                onChange({
                  ...element,
                  fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
              title={t('visionboard.inspector.italic')}
            >
              I
            </button>
            <button
              type="button"
              className={`underline${element.textDecoration === 'underline' ? ' active' : ''}`}
              onClick={() =>
                onChange({
                  ...element,
                  textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline',
                })
              }
              title={t('visionboard.inspector.underline')}
            >
              U
            </button>
          </div>
        </>
      )}
      {element.type === 'shape' && (
        <>
          <label className="ll-vb-popover-field color">
            <span>{t('visionboard.inspector.fill')}</span>
            <input
              type="color"
              value={baseHex(element.fill ?? '#818cf8')}
              onChange={(e) => onChange({ ...element, fill: e.target.value })}
            />
          </label>
          <label className="ll-vb-popover-field range">
            <span>{t('visionboard.inspector.fillOpacity')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={element.fillOpacity ?? 40}
              onChange={(e) => onChange({ ...element, fillOpacity: Number(e.target.value) })}
            />
          </label>
          <label className="ll-vb-popover-field color">
            <span>{t('visionboard.inspector.stroke')}</span>
            <input
              type="color"
              value={element.stroke ?? '#818cf8'}
              onChange={(e) => onChange({ ...element, stroke: e.target.value })}
            />
          </label>
          {element.labelText !== undefined && (
            <button
              type="button"
              className="ll-btn ghost small"
              onClick={() => onChange({ ...element, labelText: undefined })}
            >
              {t('visionboard.inspector.removeLabel')}
            </button>
          )}
        </>
      )}
      {element.type === 'image' && (
        <>
          <button
            type="button"
            className={`ll-btn ghost small${cropMode ? ' primary' : ''}`}
            onClick={onToggleCrop}
          >
            <Crop size={14} /> {t('visionboard.inspector.crop')}
          </button>
          <button type="button" className="ll-btn ghost small" onClick={onResetCrop}>
            {t('visionboard.inspector.cropReset')}
          </button>
        </>
      )}
      <div className="ll-vb-popover-actions">
        <button
          type="button"
          className="ll-icon-btn small"
          title={t('visionboard.inspector.layerDown')}
          onClick={() => onChange({ ...element, zIndex: element.zIndex - 1 })}
        >
          ↓
        </button>
        <button
          type="button"
          className="ll-icon-btn small"
          title={t('visionboard.inspector.layerUp')}
          onClick={() => onChange({ ...element, zIndex: element.zIndex + 1 })}
        >
          ↑
        </button>
        <button type="button" className="ll-icon-btn small danger" onClick={onDelete}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function CroppedImage({ element }: { element: VisionBoardElement }) {
  const insets = normalizeCrop(element.imageCrop);
  const { w, h } = imageSourceSize(element);
  const clip = frameCropClip(element, insets);

  return (
    <div className="ll-vb-image-frame">
      <img
        src={element.src}
        alt=""
        draggable={false}
        className="ll-vb-image-cropped"
        style={{
          width: w,
          height: h,
          clipPath: clip,
        }}
      />
    </div>
  );
}

function CropOverlay({ insets }: { insets: CropInsets }) {
  return (
    <div className="ll-vb-crop-lines" aria-hidden>
      <span className="ll-vb-crop-line v" style={{ left: `${insets.left * 100}%` }} />
      <span className="ll-vb-crop-line v" style={{ left: `${(1 - insets.right) * 100}%` }} />
      <span className="ll-vb-crop-line h" style={{ top: `${insets.top * 100}%` }} />
      <span className="ll-vb-crop-line h" style={{ top: `${(1 - insets.bottom) * 100}%` }} />
    </div>
  );
}

interface VisionBoardCanvasProps {
  board: VisionBoard;
}

export function VisionBoardCanvas({ board }: VisionBoardCanvasProps) {
  const { app } = useAppState();
  const { t } = useLocale();
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(
    null,
  );
  const [resize, setResize] = useState<{
    id: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    snapshot: VisionBoardElement;
  } | null>(null);
  const [cropDrag, setCropDrag] = useState<{
    id: string;
    handle: CropHandle;
    startX: number;
    startY: number;
    snapshot: CropInsets;
    elW: number;
    elH: number;
  } | null>(null);

  const bgOpacity = board.backgroundOpacity ?? 100;
  const bgColor = hexToRgba(baseHex(board.backgroundColor), bgOpacity);
  const selected = board.elements.find((e) => e.id === selectedId);

  useEffect(() => {
    if (selected?.type !== 'image') setCropMode(false);
  }, [selected?.id, selected?.type]);

  const persistBoard = useCallback(
    (patch: Partial<VisionBoard>) => {
      app.updateVisionBoard(board.id, patch);
    },
    [app, board.id],
  );

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const syncCanvasSize = () => {
      window.requestAnimationFrame(() => {
        const w = vp.clientWidth;
        const h = vp.clientHeight;
        if (w < 1 || h < 1) return;
        setCanvasSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      });
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(vp);
    window.addEventListener('resize', syncCanvasSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [board.id]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? -0.06 : 0.06;
      const oldZoom = board.zoom;
      const next = Math.min(2.5, Math.max(0.4, oldZoom + step));
      if (next === oldZoom) return;

      const rect = vp.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + vp.scrollLeft;
      const mouseY = e.clientY - rect.top + vp.scrollTop;
      const worldX = (mouseX - board.panX) / oldZoom;
      const worldY = (mouseY - board.panY) / oldZoom;
      const panX = mouseX - worldX * next;
      const panY = mouseY - worldY * next;

      persistBoard({ zoom: next, panX, panY });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [board.zoom, board.panX, board.panY, persistBoard]);

  const persistElement = useCallback(
    (element: VisionBoardElement) => {
      app.upsertVisionBoardElement(board.id, element);
    },
    [app, board.id],
  );

  const addElement = (partial: Omit<VisionBoardElement, 'id'>) => {
    const element = app.createVisionBoardElement(partial);
    app.upsertVisionBoardElement(board.id, element);
    setSelectedId(element.id);
    setTool('select');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'select') {
      if (e.target === e.currentTarget) setSelectedId(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = canvasPoint(e.clientX, e.clientY, canvas, board.zoom);

    if (tool === 'text') {
      addElement({
        type: 'text',
        x,
        y,
        width: 180,
        height: 48,
        rotation: 0,
        zIndex: board.elements.length + 1,
        content: t('visionboard.defaultText'),
        fontSize: 22,
        fontWeight: '400',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#ffffff',
      });
    } else if (tool === 'rect') {
      addElement({
        type: 'shape',
        shape: 'rect',
        x,
        y,
        width: 120,
        height: 80,
        rotation: 0,
        zIndex: board.elements.length + 1,
        fill: '#818cf8',
        fillOpacity: 40,
        stroke: '#818cf8',
        strokeWidth: 2,
      });
    } else if (tool === 'circle') {
      addElement({
        type: 'shape',
        shape: 'circle',
        x,
        y,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: board.elements.length + 1,
        fill: '#f472b6',
        fillOpacity: 40,
        stroke: '#f472b6',
        strokeWidth: 2,
      });
    } else if (tool === 'image') {
      fileInputRef.current?.click();
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const maxDim = 420;
        const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * ratio);
        const h = Math.round(img.naturalHeight * ratio);
        addElement({
          type: 'image',
          x: 48,
          y: 48,
          width: w,
          height: h,
          rotation: 0,
          zIndex: board.elements.length + 1,
          src,
          originalSrc: src,
          originalX: 48,
          originalY: 48,
          originalWidth: w,
          originalHeight: h,
          originalImageSourceWidth: w,
          originalImageSourceHeight: h,
          imageSourceWidth: w,
          imageSourceHeight: h,
          imageCrop: DEFAULT_CROP,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onElementMouseDown = (element: VisionBoardElement, e: React.MouseEvent) => {
    if (tool !== 'select') return;
    if ((e.target as HTMLElement).closest('.ll-vb-handle, .ll-vb-crop-handle, .ll-vb-popover, .ll-vb-shape-label')) {
      return;
    }
    e.stopPropagation();
    setSelectedId(element.id);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = canvasPoint(e.clientX, e.clientY, canvas, board.zoom);
    setDrag({
      id: element.id,
      startX: pt.x,
      startY: pt.y,
      elX: element.x,
      elY: element.y,
    });
  };

  const onShapeDoubleClick = (element: VisionBoardElement, e: React.MouseEvent) => {
    if (element.type !== 'shape') return;
    e.stopPropagation();
    setSelectedId(element.id);
    if (element.labelText === undefined) {
      persistElement({ ...element, labelText: t('visionboard.defaultText') });
    }
  };

  const onHandleMouseDown = (element: VisionBoardElement, handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(element.id);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = canvasPoint(e.clientX, e.clientY, canvas, board.zoom);
    setResize({
      id: element.id,
      handle,
      startX: pt.x,
      startY: pt.y,
      snapshot: { ...element },
    });
  };

  const onCropHandleMouseDown = (element: VisionBoardElement, handle: CropHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(element.id);
    setCropMode(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = canvasPoint(e.clientX, e.clientY, canvas, board.zoom);
    setCropDrag({
      id: element.id,
      handle,
      startX: pt.x,
      startY: pt.y,
      snapshot: normalizeCrop(element.imageCrop),
      elW: element.width,
      elH: element.height,
    });
  };

  useEffect(() => {
    if (!drag && !resize && !cropDrag) return;
    const canvas = canvasRef.current;

    const onMove = (e: MouseEvent) => {
      if (!canvas) return;
      const pt = canvasPoint(e.clientX, e.clientY, canvas, board.zoom);

      if (drag) {
        const el = board.elements.find((item) => item.id === drag.id);
        if (!el) return;
        persistElement({
          ...el,
          x: drag.elX + (pt.x - drag.startX),
          y: drag.elY + (pt.y - drag.startY),
        });
      }

      if (resize) {
        const dx = pt.x - resize.startX;
        const dy = pt.y - resize.startY;
        persistElement(applyResize(resize.snapshot, resize.handle, dx, dy));
      }

      if (cropDrag) {
        const el = board.elements.find((item) => item.id === cropDrag.id);
        if (!el) return;
        const dxPx = pt.x - cropDrag.startX;
        const dyPx = pt.y - cropDrag.startY;
        const nextCrop = adjustCrop(
          cropDrag.snapshot,
          cropDrag.handle,
          dxPx,
          dyPx,
          cropDrag.elW,
          cropDrag.elH,
        );
        persistElement({ ...el, imageCrop: nextCrop });
      }
    };

    const onUp = () => {
      setDrag(null);
      setResize(null);
      setCropDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, resize, cropDrag, board.elements, board.zoom, persistElement]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        app.removeVisionBoardElement(board.id, selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app, board.id, selectedId]);

  const sortedElements = [...board.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="ll-visionboard-canvas-wrap">
      <div className="ll-visionboard-toolbar">
        <div className="ll-visionboard-tool-group">
          {(
            [
              ['select', MousePointer2, t('visionboard.tools.select')],
              ['text', Type, t('visionboard.tools.text')],
              ['rect', Square, t('visionboard.tools.rect')],
              ['circle', Circle, t('visionboard.tools.circle')],
              ['image', ImagePlus, t('visionboard.tools.image')],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              className={`ll-vb-tool-btn${tool === id ? ' active' : ''}`}
              onClick={() => setTool(id)}
              title={label}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        <span className="ll-visionboard-toolbar-divider" />
        <div className="ll-visionboard-tool-group">
          <button
            type="button"
            className="ll-vb-tool-btn"
            onClick={() => persistBoard({ zoom: Math.min(2.5, board.zoom + 0.1) })}
            title={t('visionboard.zoomIn')}
          >
            <ZoomIn size={16} />
          </button>
          <span className="ll-visionboard-zoom-label">{Math.round(board.zoom * 100)}%</span>
          <button
            type="button"
            className="ll-vb-tool-btn"
            onClick={() => persistBoard({ zoom: Math.max(0.4, board.zoom - 0.1) })}
            title={t('visionboard.zoomOut')}
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />

      <div ref={viewportRef} className="ll-visionboard-viewport" style={{ backgroundColor: bgColor }}>
        <div
          ref={canvasRef}
          className="ll-visionboard-canvas"
          style={{
            width: canvasSize.w,
            height: canvasSize.h,
            transform: `translate(${board.panX}px, ${board.panY}px) scale(${board.zoom})`,
            transformOrigin: 'top left',
          }}
          onClick={handleCanvasClick}
          role="presentation"
        >
          {selected && (
            <div
              className="ll-vb-popover-anchor"
              style={{ left: selected.x, top: selected.y, width: selected.width }}
            >
              <ElementPopover
                element={selected}
                cropMode={cropMode && selected.type === 'image'}
                onChange={persistElement}
                onDelete={() => {
                  app.removeVisionBoardElement(board.id, selected.id);
                  setSelectedId(null);
                }}
                onToggleCrop={() => {
                  if (!cropMode) {
                    if (selected.type === 'image') {
                      persistElement({
                        ...selected,
                        imageSourceWidth: selected.width,
                        imageSourceHeight: selected.height,
                      });
                    }
                    setCropMode(true);
                    return;
                  }
                  if (selected.type !== 'image') {
                    setCropMode(false);
                    return;
                  }
                  const insets = normalizeCrop(selected.imageCrop);
                  if (hasCropInsets(insets)) {
                    void bakeCropIntoElement(selected).then((baked) => {
                      if (baked) persistElement(baked);
                      setCropMode(false);
                    });
                  } else {
                    setCropMode(false);
                  }
                }}
                onResetCrop={() => persistElement(resetCropForElement(selected))}
                t={t}
              />
            </div>
          )}

          {sortedElements.map((element) => {
            const showCropHandles =
              cropMode && selectedId === element.id && element.type === 'image';
            return (
              <div
                key={element.id}
                className={`ll-vb-element ll-vb-${element.type}${selectedId === element.id ? ' selected' : ''}${showCropHandles ? ' cropping' : ''}`}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  transform: `rotate(${element.rotation}deg)`,
                  zIndex: element.zIndex,
                }}
                onMouseDown={(e) => onElementMouseDown(element, e)}
                onDoubleClick={(e) => onShapeDoubleClick(element, e)}
              >
                {element.type === 'text' && (
                  <div
                    className="ll-vb-text-inner"
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                      fontSize: element.fontSize,
                      fontWeight: element.fontWeight ?? '400',
                      fontStyle: element.fontStyle ?? 'normal',
                      textDecoration: element.textDecoration ?? 'none',
                      color: element.color,
                    }}
                    onBlur={(ev) =>
                      persistElement({ ...element, content: ev.currentTarget.textContent ?? '' })
                    }
                  >
                    {element.content}
                  </div>
                )}
                {element.type === 'shape' && element.shape === 'rect' && (
                  <div
                    className="ll-vb-shape-inner"
                    style={{
                      background: fillColor(element),
                      border: `${element.strokeWidth ?? 2}px solid ${element.stroke}`,
                      borderRadius: 8,
                    }}
                  />
                )}
                {element.type === 'shape' && element.shape === 'circle' && (
                  <div
                    className="ll-vb-shape-inner circle"
                    style={{
                      background: fillColor(element),
                      border: `${element.strokeWidth ?? 2}px solid ${element.stroke}`,
                    }}
                  />
                )}
                {element.type === 'shape' && element.labelText !== undefined && (
                  <div
                    className="ll-vb-shape-label"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(ev) =>
                      persistElement({
                        ...element,
                        labelText: ev.currentTarget.textContent?.trim() || undefined,
                      })
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {element.labelText}
                  </div>
                )}
                {element.type === 'image' && element.src && <CroppedImage element={element} />}

                {showCropHandles && (
                  <>
                    <CropOverlay insets={normalizeCrop(element.imageCrop)} />
                    {CROP_HANDLES.map((handle) => {
                      const insets = normalizeCrop(element.imageCrop);
                      const style: React.CSSProperties =
                        handle === 'w'
                          ? { left: `${insets.left * 100}%` }
                          : handle === 'e'
                            ? { left: `${(1 - insets.right) * 100}%` }
                            : handle === 'n'
                              ? { top: `${insets.top * 100}%` }
                              : { top: `${(1 - insets.bottom) * 100}%` };
                      return (
                        <span
                          key={`crop-${handle}`}
                          className={`ll-vb-crop-handle ll-vb-crop-handle-${handle}`}
                          style={style}
                          onMouseDown={(e) => onCropHandleMouseDown(element, handle, e)}
                        />
                      );
                    })}
                  </>
                )}

                {selectedId === element.id &&
                  !showCropHandles &&
                  HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className={`ll-vb-handle ll-vb-handle-${handle}`}
                      onMouseDown={(e) => onHandleMouseDown(element, handle, e)}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VisionBoardSelector() {
  const { app } = useAppState();
  const { t } = useLocale();
  const boards = app.visionBoards.getAll();
  const activeId = app.visionBoards.getActiveId();
  const active = app.visionBoards.getActive();
  const bgOpacity = active?.backgroundOpacity ?? 100;

  return (
    <div className="ll-visionboard-selector">
      <div className="ll-visionboard-board-tabs" role="tablist">
        <Layers size={16} aria-hidden className="ll-visionboard-board-icon" />
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={b.id === activeId}
            className={`ll-vb-board-tab${b.id === activeId ? ' active' : ''}`}
            onClick={() => app.setActiveVisionBoard(b.id)}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          className="ll-vb-board-tab add"
          onClick={() => app.createVisionBoard()}
          title={t('visionboard.newBoard')}
        >
          <Plus size={14} />
        </button>
      </div>

      {active && (
        <div className="ll-visionboard-board-settings">
          <label className="ll-vb-setting" title={t('visionboard.background')}>
            <input
              type="color"
              value={baseHex(active.backgroundColor)}
              onChange={(e) =>
                app.updateVisionBoard(active.id, { backgroundColor: e.target.value })
              }
            />
          </label>
          <label className="ll-vb-setting grow">
            <span>{t('visionboard.backgroundOpacity')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={bgOpacity}
              onChange={(e) =>
                app.updateVisionBoard(active.id, { backgroundOpacity: Number(e.target.value) })
              }
            />
            <span className="ll-vb-opacity-value">{bgOpacity}%</span>
          </label>
          {boards.length > 1 && (
            <button
              type="button"
              className="ll-icon-btn danger small"
              onClick={() => app.deleteVisionBoard(activeId)}
              title={t('visionboard.deleteBoard')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
