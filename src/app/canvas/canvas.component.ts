import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


type ShapeType = 'rect' | 'square' | 'circle' | 'ellipse' | 'diamond' | 'triangle' | 'hexagon' | 'image'|
'voltmeter'|'Ammeter';

interface ElementShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  href?: string;
  label?: string;             // 🆕 Main label (inside)
  externalLabel?: string;     // 🆕 Additional external label (outside)
  //externalLabelPosition?: 'top' | 'bottom' | 'left' | 'right';  // 🆕 Label direction
  externalLabelX?: number;
  externalLabelY?: number;
}

interface Connection {
  from: string;
  to?: string;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  bendPoints?: { x: number, y: number }[]; 
}
interface FreeText {
  id: string;
  x: number;
  y: number;
  text: string;
}



@Component({
  selector: 'app-canvas',
  standalone: true,
  //imports: [CommonModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css'],
  imports: [
    CommonModule,
    FormsModule
     ]
})
export class CanvasComponent {

 freeTexts: FreeText[] = [];
selectedText: FreeText | null = null;
draggingText = false;
textOffsetX = 0;
textOffsetY = 0;

editingTextId: string | null = null;

  elements: ElementShape[] = [];
  connections: Connection[] = [];
  selectedElement: ElementShape | null = null;

  externalLabelDragData: { element: ElementShape, offsetX: number, offsetY: number } | null = null;

  connectingFrom: { x: number; y: number; elementId: string } | null = null;
  previewLine: { x: number; y: number } | null = null;

  selectedConnection: Connection | null = null;
  draggingArrowEnd: 'from' | 'to' | null = null;

  isConnecting = false;
  resizing = false;
  dragging = false;
  panning = false;
  resizeCorner: 'tl' | 'tr' | 'bl' | 'br' | null = null;

  zoomLevel = 1;
  panX = 0;
  panY = 0;

  canvasWidth = 2000;
  canvasHeight = 2000;
  gridSize = 40; // Fixed to match CSS grid
  snapToGrid = true;

  private offsetX = 0;
  private offsetY = 0;
  private resizingStart = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };

  private undoStack: { elements: ElementShape[]; connections: Connection[] }[] = [];
  private redoStack: { elements: ElementShape[]; connections: Connection[] }[] = [];

draggingBendPoint: { conn: Connection; point: { x: number; y: number } } | null = null;

onExternalLabelMouseDown(event: MouseEvent, el: ElementShape) {
  event.stopPropagation();
  const svgPt = this.getCursorSVGPosition(event);
  const offsetX = svgPt.x - (el.externalLabelX ?? this.getExternalLabelX(el));
  const offsetY = svgPt.y - (el.externalLabelY ?? this.getExternalLabelY(el));
  this.externalLabelDragData = { element: el, offsetX, offsetY };
}


  constructor(){
    console.log("hi")
  }
  ngOnInit() {
     console.log("onini")
    // No need to generate grid lines — fixed CSS grid now
  }

  private saveState() {
    this.undoStack.push({
      elements: JSON.parse(JSON.stringify(this.elements)),
      connections: JSON.parse(JSON.stringify(this.connections)),
    });
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push({
      elements: JSON.parse(JSON.stringify(this.elements)),
      connections: JSON.parse(JSON.stringify(this.connections)),
    });
    const prev = this.undoStack.pop();
    if (prev) {
      this.elements = prev.elements;
      this.connections = prev.connections;
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push({
      elements: JSON.parse(JSON.stringify(this.elements)),
      connections: JSON.parse(JSON.stringify(this.connections)),
    });
    const next = this.redoStack.pop();
    if (next) {
      this.elements = next.elements;
      this.connections = next.connections;
    }
  }

  addShape(type: ShapeType) {
    this.saveState();

    let width = 120;
    let height = 80;

    switch (type) {
      case 'square':
        width = height = 100;
        break;
      case 'circle':
        width = height = 90;
        break;
      case 'ellipse':
        width = 140;
        height = 70;
        break;
      case 'image':
        width = height = 100;
        break;
    case 'voltmeter':
      case 'Ammeter':
      width = 300;
      height = 300;
      break;
      case 'diamond':
      case 'triangle':
      case 'hexagon':
        width = 120;
        height = 100;
        break;
      case 'rect':
      default:
        width = 140;
        height = 80;
        break;
    }

    const shape: ElementShape = {
      id: crypto.randomUUID(),
      type,
      x: 100,
      y: 100,
      width,
      height,
      label: type,  // default inside text
      externalLabel: '', // empty by default
      externalLabelX: 100 + width + 20,
      externalLabelY: 100 + height / 2,
      //externalLabelPosition: 'bottom'
    };
  
    this.elements.push(shape);
  }

  deleteSelected() {
    if (!this.selectedElement) return;
    this.saveState();
    this.elements = this.elements.filter(el => el !== this.selectedElement);
    this.connections = this.connections.filter(conn =>
      conn.from !== this.selectedElement?.id && conn.to !== this.selectedElement?.id
    );
    this.selectedElement = null;
  }

  triggerImageUpload() {
    const input = document.getElementById('imageInput') as HTMLInputElement;
    input?.click();
  }

  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.saveState();
      const imgShape: ElementShape = {
        id: crypto.randomUUID(),
        type: 'image',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        href: reader.result as string, 
      };
      this.elements.push(imgShape);
    };
    reader.readAsDataURL(file);
  }
  onConnectionHandleMouseDown(event: MouseEvent, conn: Connection, end: 'from' | 'to') {
  event.stopPropagation();
  this.selectedConnection = conn;
  this.draggingArrowEnd = end;
}


  onMouseDown(event: MouseEvent, el: ElementShape) {
  event.stopPropagation();
  this.selectedElement = el;
  this.dragging = true;

  // Get actual mouse position in SVG coordinates
  const svgPt = this.getCursorSVGPosition(event);

  // Calculate the offset from the shape's top-left corner
  this.offsetX = svgPt.x - el.x;
  this.offsetY = svgPt.y - el.y;
}

  onBendHandleMouseDown(event: MouseEvent, conn: Connection, pt: { x: number, y: number }) {
  event.stopPropagation();
  this.draggingBendPoint = { conn, point: pt };
}

 onConnectionClick(conn: Connection, event?: MouseEvent) {
  event?.stopPropagation();
  this.selectedConnection = conn;
  this.selectedElement = null;
  if (event) {
    const pos = this.getCursorSVGPosition(event);
    if (!conn.bendPoints) conn.bendPoints = [];
    conn.bendPoints.push({ x: pos.x, y: pos.y });
  }
}

onConnectionDoubleClick(conn: Connection, event: MouseEvent) {
  const pos = this.getCursorSVGPosition(event);
  if (!conn.bendPoints) {
    conn.bendPoints = [];
  }
  conn.bendPoints.push({ x: pos.x, y: pos.y });
  this.saveState();
}

getExternalLabelX(el: any): number {
  const offset = 100;
  switch (el.externalLabelPosition) {
    case 'left':
      return el.x - offset;
    case 'right':
      return el.x + el.width + offset;
    default:
      return el.x + el.width / 2;
  }
}

getExternalLabelY(el: any): number {
  const offset = 15;
  switch (el.externalLabelPosition) {
    case 'top':
      return el.y - offset;
    case 'bottom':
      return el.y + el.height + offset;
    default:
      return el.y + el.height / 2;
  }
}




  onMouseMove(event: MouseEvent) {
    if (this.connectingFrom && this.previewLine) {
  document.body.style.cursor = 'grabbing'; // Show grabbing hand
} else {
  document.body.style.cursor = 'default'; // Reset when not dragging
}

  const svg = (event.target as Element).closest('svg') as SVGSVGElement;
  if (!svg) return;

  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const cursor = pt.matrixTransform(svg.getScreenCTM()!.inverse());

  if (this.externalLabelDragData) {
  const svgPt = this.getCursorSVGPosition(event);
  const { element, offsetX, offsetY } = this.externalLabelDragData;
  element.externalLabelX = svgPt.x - offsetX;
  element.externalLabelY = svgPt.y - offsetY;
  return;
}

   if (this.selectedConnection && this.draggingArrowEnd) {
  const connIndex = this.connections.indexOf(this.selectedConnection);
  if (connIndex !== -1) {
    const updated = { ...this.connections[connIndex] }; // Clone
    if (this.draggingArrowEnd === 'from') {
      updated.fromX = cursor.x;
      updated.fromY = cursor.y;
    } else {
      updated.toX = cursor.x;
      updated.toY = cursor.y;
    }
    this.connections[connIndex] = updated; // Replace with new object (triggers change detection)
    this.selectedConnection = updated;
  }
  return;
}
if (this.draggingBendPoint) {
  const svgPt = this.getCursorSVGPosition(event);
  this.draggingBendPoint.point.x = svgPt.x;
  this.draggingBendPoint.point.y = svgPt.y;
  return;
}


   if (this.connectingFrom && this.connections.length > 0) {
    const lastConn = this.connections[this.connections.length - 1];
    lastConn.toX = cursor.x;
    lastConn.toY = cursor.y;
    this.previewLine = { x: cursor.x, y: cursor.y };
  }

  const x = cursor.x;
  const y = cursor.y;

  if (this.resizing && this.selectedElement && this.resizeCorner) {
    const dx = x - this.resizingStart.x;
    const dy = y - this.resizingStart.y;
    switch (this.resizeCorner) {
      case 'br':
        this.selectedElement.width += dx;
        this.selectedElement.height += dy;
        break;
      case 'tr':
        this.selectedElement.y += dy;
        this.selectedElement.height -= dy;
        this.selectedElement.width += dx;
        break;
      case 'bl':
        this.selectedElement.x += dx;
        this.selectedElement.width -= dx;
        this.selectedElement.height += dy;
        break;
      case 'tl':
        this.selectedElement.x += dx;
        this.selectedElement.y += dy;
        this.selectedElement.width -= dx;
        this.selectedElement.height -= dy;
        break;
    }
    this.resizingStart = { x, y };
  } else if (this.dragging && this.selectedElement) {
    let newX = x - this.offsetX;
    let newY = y - this.offsetY;
    if (this.snapToGrid) {
      newX = Math.round(newX / this.gridSize) * this.gridSize;
      newY = Math.round(newY / this.gridSize) * this.gridSize;
    }
    const dx = newX - this.selectedElement.x;
    const dy = newY - this.selectedElement.y;

    this.selectedElement.x = newX;
    this.selectedElement.y = newY;

     for (const conn of this.connections) {
    if (conn.from === this.selectedElement!.id) {
      conn.fromX = this.selectedElement.x + this.selectedElement.width / 2;
     conn.fromY = this.selectedElement.y + this.selectedElement.height / 2;
    }
    if (conn.to === this.selectedElement!.id) {
     conn.toX = this.selectedElement.x + this.selectedElement.width / 2;
     conn.toY = this.selectedElement.y + this.selectedElement.height / 2;
    }
  }
  } else if (this.panning) {
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;
    this.panX += dx;
    this.panY += dy;
    this.panStart = { x: event.clientX, y: event.clientY };
  }
  
  if (this.draggingText && this.selectedText) {
  const svgPos = this.getCursorSVGPosition(event);
  this.selectedText.x = svgPos.x - this.textOffsetX;
  this.selectedText.y = svgPos.y - this.textOffsetY;
  return;
}

}


 onMouseUp() {
  if (this.connectingFrom && this.previewLine) {
    
    // Check if there's a shape at the drop position
    const target = this.getElementAtPosition(this.previewLine.x, this.previewLine.y);
    const lastConn = this.connections[this.connections.length - 1];

    if (target && target.id !== this.connectingFrom.elementId) {
      lastConn.to = target.id;
      const centerX = target.x + target.width / 2;
      const centerY = target.y + target.height / 2;

      const dx = centerX - lastConn.fromX!;
      const dy = centerY - lastConn.fromY!;
      const angle = Math.atan2(dy, dx);

      // Half width/height for edge distance
      const offsetX = (target.width / 2) * Math.cos(angle);
      const offsetY = (target.height / 2) * Math.sin(angle);

      lastConn.toX = centerX - offsetX;
       lastConn.toY = centerY - offsetY;

      this.saveState();
    }else {
      // If not dropped on a valid shape, remove the connection
      
    }
  }    
  
   if (this.selectedConnection && this.draggingArrowEnd) {
    this.saveState();
  }

  if (this.dragging || this.resizing) {
    this.saveState();
  }

  if (this.draggingBendPoint) {
  this.saveState(); // Optional, for undo support
  this.draggingBendPoint = null;
}
if (this.draggingText) {
  this.draggingText = false;
}



  this.connectingFrom = null;
  this.previewLine = null;
  this.dragging = false;
  this.resizing = false;
  this.panning = false;
  this.resizeCorner = null;
  this.draggingArrowEnd = null;
  this.externalLabelDragData = null;

  
}

getElbowPath(conn: Connection): string {
  const { fromX, fromY, toX, toY, bendPoints } = conn;

  // 1. If incomplete (dragging in progress), draw a straight line
  if (fromX == null || fromY == null || toX == null || toY == null) {
    const x1 = fromX ?? toX!;
    const y1 = fromY ?? toY!;
    const x2 = toX ?? fromX!;
    const y2 = toY ?? fromY!;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // 2. If user-defined bend points, use them
  if (bendPoints && bendPoints.length > 0) {
    const points = [{ x: fromX, y: fromY }, ...bendPoints, { x: toX, y: toY }];
    return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  }

  // 3. Auto elbow path based on drag direction
  const horizontal = Math.abs(toX - fromX) > Math.abs(toY - fromY);
  if (horizontal) {
    const midX = (fromX + toX) / 2;
    return `
      M ${fromX} ${fromY}
      L ${midX} ${fromY}
      L ${midX} ${toY}
      L ${toX} ${toY}
    `;
  } else {
    const midY = (fromY + toY) / 2;
    return `
      M ${fromX} ${fromY}
      L ${fromX} ${midY}
      L ${toX} ${midY}
      L ${toX} ${toY}
    `;
  }
}


  onSvgMouseDown(event: MouseEvent) {
  const target = event.target as SVGElement;

  // Select connection if clicked on a line
  if (target.tagName === 'line') {
   const index = Array.from(document.querySelectorAll('line')).indexOf(target as SVGLineElement);
    if (index >= 0 && index < this.connections.length) {
      this.selectedConnection = this.connections[index];
      this.selectedElement = null;
      return; // prevent deselecting below
    }
  }

  // If clicked on empty canvas or background
  if (target instanceof SVGSVGElement || target instanceof SVGRectElement) {
    this.selectedElement = null;
    this.selectedConnection = null;
    this.panning = true;
    this.panStart = { x: event.clientX, y: event.clientY };
  }
}

addFreeText() {
  const newText: FreeText = {
    id: crypto.randomUUID(),
    x: 100,
    y: 100,
    text: 'New Text'
  };
  this.freeTexts.push(newText);
  this.selectedText = newText;
}

onFreeTextMouseDown(event: MouseEvent, text: FreeText) {
  event.stopPropagation();
  this.selectedText = text;
  this.draggingText = true;
  const svgPos = this.getCursorSVGPosition(event);
  this.textOffsetX = svgPos.x - text.x;
  this.textOffsetY = svgPos.y - text.y;
}
enableTextEditing(t: FreeText) {
  this.selectedText = t;
  this.editingTextId = t.id;
}

stopTextEditing() {
  this.editingTextId = null;
}


  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = -event.deltaY * 0.001;
    this.zoomLevel = Math.min(Math.max(this.zoomLevel + delta, 0.1), 5);
  }

  startResize(event: MouseEvent, corner: string) {
    if (!['tl', 'tr', 'bl', 'br'].includes(corner)) return;
    this.resizeCorner = corner as 'tl' | 'tr' | 'bl' | 'br';
    event.stopPropagation();
    const x = (event.offsetX - this.panX) / this.zoomLevel;
    const y = (event.offsetY - this.panY) / this.zoomLevel;
    this.resizing = true;
    this.resizingStart = { x, y };
  }
 

  onShapeClick(el: ElementShape) {
    if (this.isConnecting && this.selectedElement && this.selectedElement !== el) {
      this.saveState();
      this.connections.push({ from: this.selectedElement.id, to: el.id });
      this.isConnecting = false;
      this.selectedElement = null;
    } else {
      this.selectedElement = el;
    }
  }
  startConnectionDrag(event: MouseEvent, el: ElementShape, side: string) {
  event.stopPropagation();
  const start = this.getConnectionPoint(el, side);
  this.connectingFrom = {
    elementId: el.id,
    x: start.x,
    y: start.y,
  };
  this.previewLine = { x: start.x, y: start.y };
  this.connections.push({
    from: el.id,
    fromX: start.x,
    fromY: start.y,
    toX: start.x,
    toY: start.y,
    bendPoints: []
  });
}


  getElementById(id: string): ElementShape | undefined {
    return this.elements.find(e => e.id === id);
  }

  getCircleRadius(el: ElementShape): number {
    return Math.min(el.width, el.height) / 2;
  }

  getPolygonPoints(el: ElementShape): string {
    const { x, y, width, height, type } = el;
    switch (type) {
      case 'diamond':
        return `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;
      case 'triangle':
        return `${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`;
      case 'hexagon':
        const w = width;
        const h = height;
        const hw = w / 2;
        const qw = w / 4;
        const hh = h / 2;
        return `${x + qw},${y} ${x + 3 * qw},${y} ${x + w},${y + hh} ${x + 3 * qw},${y + h} ${x + qw},${y + h} ${x},${y + hh}`;
      default:
        return '';
    }
  }
  getConnectionPoint(el: ElementShape, side: string): { x: number; y: number } {
  const centerX = el.x + el.width / 2;
  const centerY = el.y + el.height / 2;

  switch (side) {
    case 'top':
      return { x: centerX, y: el.y };
    case 'right':
      return { x: el.x + el.width, y: centerY };
    case 'bottom':
      return { x: centerX, y: el.y + el.height };
    case 'left':
      return { x: el.x, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
}

getElementAtPosition(x: number, y: number): ElementShape | null {
  return this.elements.find(el =>
    x >= el.x &&
    x <= el.x + el.width &&
    y >= el.y &&
    y <= el.y + el.height
  ) || null;
}

  exportAsSVG() {

    console.log(this.elements.filter(e => e.type === 'image'));

    const svgEl = document.querySelector('svg');
    if (!svgEl) return;

    const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
    const gridGroup = clonedSvg.querySelector('.grid-lines');
    if (gridGroup) gridGroup.remove();

    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

   const images = clonedSvg.querySelectorAll('image');
  images.forEach((img: SVGImageElement) => {
    const href = img.getAttribute('href');
    if (href && href.startsWith('data:image')) {
      img.setAttribute('href', href); // Or xlink:href if needed
      img.removeAttribute('href'); 
    }
  });

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clonedSvg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diagram.svg';
    a.click();
  }

  saveDiagram() {
    const data = {
      elements: this.elements,
      connections: this.connections,
    };
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diagram.json';
    a.click();
  }

  triggerLoad() {
    const input = document.getElementById('loadInput') as HTMLInputElement;
    input?.click();
  }

  loadDiagram(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result as string);
      this.saveState();
      this.elements = data.elements || [];
      this.connections = data.connections || [];
    };
    reader.readAsText(file);
  }
  getCursorSVGPosition(event: MouseEvent): { x: number; y: number } {
  const svg = (event.target as Element).closest('svg') as SVGSVGElement;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return { x: cursorpt.x, y: cursorpt.y };
}

getShapeNear(x: number, y: number, threshold: number) {
  return this.elements.find(el =>
    Math.abs(x - (el.x + el.width / 2)) < el.width / 2 + threshold &&
    Math.abs(y - (el.y + el.height / 2)) < el.height / 2 + threshold
  );
}

getClosestPort(shape: any, x: number, y: number) {
  const ports = [
    { x: shape.x + shape.width / 2, y: shape.y }, // top
    { x: shape.x + shape.width / 2, y: shape.y + shape.height }, // bottom
    { x: shape.x, y: shape.y + shape.height / 2 }, // left
    { x: shape.x + shape.width, y: shape.y + shape.height / 2 }, // right
  ];

  let minDist = Infinity;
  let closest = ports[0];

  for (const p of ports) {
    const dist = Math.hypot(p.x - x, p.y - y);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }

  return closest;
}


}


