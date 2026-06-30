import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { tree as d3tree } from 'd3-hierarchy';
import { line } from 'd3-shape';
import 'd3-transition';
import { filter, forEach, get, map } from 'lodash-es';

// Heart drawn as an SVG path (centered at the origin, ~11px) so the marriage
// marker renders identically across macOS / Windows / Linux instead of relying on
// a platform-native emoji glyph.
const MARRIAGE_HEART_PATH =
  'M0,5.05 l-0.78,-0.71 C-3.56,1.81 -5.4,0.15 -5.4,-1.89 C-5.4,-3.55 -4.09,-4.86 -2.43,-4.86 ' +
  'C-1.49,-4.86 -0.59,-4.42 0,-3.73 C0.59,-4.42 1.49,-4.86 2.43,-4.86 C4.09,-4.86 5.4,-3.55 5.4,-1.89 ' +
  'C5.4,0.15 3.56,1.81 0.78,4.34 L0,5.05 z';
// Zigzag "crack" overlaid on the heart for divorced couples (broken-heart look).
const MARRIAGE_HEART_CRACK_PATH =
  'M0,-3.7 L-1.2,-1.6 L1,-0.2 L-1,1.6 L0.4,3 L0,5.05';

class TreeBuilder {
  static DEBUG_LEVEL = 0;
  static CONNECTOR_RADIUS = 16;
  root: any;
  siblings: any[];
  opts: any;
  allNodes: any[];
  nodeSize: number[];
  marriageSize: number[];
  zoom: any;
  svg: any;
  g: any;
  tree: any;

  constructor(root: any, siblings: any[], opts: any) {
    TreeBuilder.DEBUG_LEVEL = opts.debug ? 1 : 0;

    this.root = root;
    this.siblings = siblings;
    this.opts = opts;

    // flatten nodes
    this.allNodes = this._flatten(this.root);

    // calculate node sizes
    this.nodeSize = opts.callbacks.nodeSize.call(
      this,
      // filter hidden and marriage nodes
      filter(
        this.allNodes,
        (node: any) => !(node.hidden || get(node, 'data.isMarriage'))
      ),
      opts.nodeWidth,
      opts.callbacks.textRenderer,
      opts.nodeHeight
    );
    this.marriageSize = opts.callbacks.marriageSize.call(
      this,
      // filter hidden and non marriage nodes
      filter(
        this.allNodes,
        (node: any) => !node.hidden && get(node, 'data.isMarriage')
      ),
      this.opts.marriageNodeSize
    );
  }

  create() {
    let opts = this.opts;
    let nodeSize = this.nodeSize;
    let duration = opts.duration ?? 750;
    let siblingDelay = duration > 0 ? 200 : 0;

    let width = opts.width + opts.margin.left + opts.margin.right;
    let height = opts.height + opts.margin.top + opts.margin.bottom;

    // create zoom handler
    // ... inside create() method ...

    const zoom = (this.zoom = d3Zoom()
      .scaleExtent([0.1, 10])
      // Optimize filter: Only allow left mouse button or touch (ignore right-click)
      .filter(function(event) {
        return !event.button || event.button === 0;
      })
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      }));

    // make a svg
    const svg = (this.svg = select(opts.target)
      .append('svg')
      .style('width', '100%')      // Force width to fill container
      .style('height', '100%')     // Force height to fill container
      .attr('viewBox', [0, 0, width, height] as any)
      .style('overflow', 'visible')
      .style('touch-action', 'none')
      .style('user-select', 'none')
      .style('-webkit-user-select', 'none')
      .style('cursor', 'grab')
      // .style('transform', 'translateZ(0)') // Removed: Can cause conflicts on iOS
      .call(zoom as any)
      .on("dblclick.zoom", null)
    );

    // Windows Touch Fix removed: D3 v7 handles touch events natively.
    // Preserving comment for history: Was previously needed for D3v4.

    // Add grid pattern definitions
    const defs = svg.append('defs');
    const gridSize = 30; // Distance between dots
    
    // Grid line pattern
    const pattern = defs.append('pattern')
        .attr('id', 'grid-line-pattern')
        .attr('width', gridSize)
        .attr('height', gridSize)
        .attr('patternUnits', 'userSpaceOnUse');
        
    pattern.append('path')
        .attr('d', `M ${gridSize} 0 L 0 0 0 ${gridSize}`)
        .attr('fill', 'none')
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1);

    // Add a rectangle with the grid pattern as background
    // Restored large dimensions to cover "gutters" (outside viewBox) when overflow is visible
    // This ensures the grid covers the full screen even if aspect ratio causes letterboxing
    svg.append('rect')
       .attr('width', '500%')
       .attr('height', '500%')
       .attr('x', '-200%')
       .attr('y', '-200%')
       .style('fill', 'url(#grid-line-pattern)')
       .style('pointer-events', 'all')
       .style('touch-action', 'none'); // Ensure it captures events

    // create svg group that holds all nodes
    const g = (this.g = svg.append('g')
      .attr('cursor', 'grab'));
      // .style('will-change', 'transform')); // REMOVED: Partial rendering issues on Safari

    // set zoom identity
    svg.call(
      zoom.transform as any,
      zoomIdentity.translate(width / 2, opts.margin.top).scale(1)
    );

    // Compute the layout.
    this.tree = d3tree()
      .nodeSize([
        nodeSize[0] * 2,
        opts.callbacks.nodeHeightSeperation.call(this, nodeSize[0], nodeSize[1])
      ]);

    this.tree.separation(function separation(a: any, b: any) {
      if (a.data.hidden || b.data.hidden) {
        return 0.3;
      } else {
        return 0.6;
      }
    });

    this._update(this.root);
  }

  _update(source: any) {
    let opts = this.opts;
    let nodeSize = this.nodeSize;
    let marriageSize = this.marriageSize;
    let duration = opts.duration ?? 750;
    let siblingDelay = duration > 0 ? 200 : 0;

    let treenodes = this.tree(source);
    let links = treenodes.links();

    // Create the link lines.
    let linkPaths = this.g
      .selectAll('.link')
      .data(links)
      .enter()
      // filter links with no parents to prevent empty nodes
      .filter(function (l: any) {
        return !l.target.data.noParent;
      })
      .append('path')
      .attr('class', function (l: any) {
        const sourceReadOnly = l?.source?.data?.extra?.isReadOnly === true;
        const targetReadOnly = l?.target?.data?.extra?.isReadOnly === true;
        const classes = [opts.styles.linage];
        if (sourceReadOnly && targetReadOnly) classes.push('readonly');
        return classes.join(' ');
      })
      .attr('d', this._elbow.bind(this))
      .style('opacity', duration === 0 ? 1 : 0);

    if (duration > 0) {
      linkPaths
        .transition()
        .duration(duration)
        .style('opacity', 1);
    }

    let nodes = this.g.selectAll('.node').data(treenodes.descendants()).enter();

    this._linkSiblings();

    // Draw siblings (marriage)
    let siblingPaths = this.g
      .selectAll('.sibling')
      .data(this.siblings)
      .enter()
      .append('path')
      .attr('class', function (d: any) {
        const relationType = d?.target?.marriageNode?.data?.extra?.relationType;
        const hasDeceasedPartner =
          d?.target?.marriageNode?.data?.extra?.hasDeceasedPartner === true;
        const sourceReadOnly = d?.source?.data?.extra?.isReadOnly === true;
        const targetReadOnly = d?.target?.data?.extra?.isReadOnly === true;
        const classes = [opts.styles.marriage];
        if (relationType === 'divorced') classes.push('divorced');
        if (hasDeceasedPartner) classes.push('deceased');
        if (sourceReadOnly && targetReadOnly) {
          classes.push('readonly');
        }
        return classes.join(' ');
      })
      .attr('d', this._siblingLine.bind(this))
      .style('opacity', duration === 0 ? 1 : 0);

    if (duration > 0) {
      siblingPaths
        .transition()
        .duration(duration)
        .delay(siblingDelay)
        .style('opacity', 1);
    }

    this._renderMarriageMarkers(duration, siblingDelay);

    // Set opacity to 1 immediately if logic suggests a refresh, but transition is nice.
    // However, for existing nodes, we want to update position.
    
    // Create the node groups.
    let nodeGroups = nodes
      .append('g')
      .filter(function (d: any) {
        return d.data.hidden ? false : true;
      })
      .attr('class', function (d: any) {
        // Add gender-based class to the SVG group for hover styling
        const baseClass = 'node';
        const nodeClass = d.data.class || '';
        return `${baseClass} ${nodeClass}`.trim();
      })
      // Initial position - if we have a way to know previous position, that's better.
      // For now, scale(0) is the "enter" animation.
      .attr('transform', function (d: any) {
         if (duration === 0) {
           return 'translate(' + d.x + ',' + d.y + ')';
         }
        return 'translate(' + d.x + ',' + d.y + ') scale(0)';
      })
      .style('opacity', duration === 0 ? 1 : 0);

    // Animate nodes entering
    if (duration > 0) {
      nodeGroups.transition()
        .duration(duration)
        .attr('transform', function (d: any) {
          return 'translate(' + d.x + ',' + d.y + ')';
        })
        .style('opacity', 1);
    }

    // Append pure SVG card content to each node group (NO foreignObject!)
    nodeGroups
      .append('g')
      .attr('class', 'card-content')
      .attr('transform', function (d: any) {
        // Offset so card is centered on the node position
        return 'translate(' + (-Math.round(d.cWidth / 2)) + ',' + (-Math.round(d.cHeight / 2)) + ')';
      })
      .attr('id', function (d: any) {
        return d.id;
      })
      .html(function (d: any) {
        if (d.data.isMarriage) {
          return opts.callbacks.marriageRenderer.call(
            this,
            d.x,
            d.y,
            marriageSize[0],
            marriageSize[1],
            d.data.extra,
            d.data.id,
            d.data.class
          );
        } else {
          return opts.callbacks.nodeRenderer.call(
            this,
            d.data.name,
            d.x,
            d.y,
            nodeSize[0],
            nodeSize[1],
            d.data.extra,
            d.data.id,
            d.data.class,
            d.data.textClass,
            opts.callbacks.textRenderer
          );
        }
      })
      .on('dblclick', function (event, d: any) {
        event.stopPropagation();
        if (d.data.hidden || d.data.isMarriage) return;
        opts.callbacks.nodeDblClick.call(this, d.data.name, d.data.extra, d.data.id);
      })
      .on('click', function (event, d: any) {
        // ignore double-clicks and clicks on hidden nodes
        if (event.detail === 2 || d.data.hidden) {
          return;
        }
        if (d.data.isMarriage) {
          opts.callbacks.marriageClick.call(this, d.data.extra, d.data.id);
        } else {
          // Pass event so the callback can inspect the click target
          opts.callbacks.nodeClick.call(this, d.data.name, d.data.extra, d.data.id, event);
        }
      })
      .on('contextmenu', function (event, d: any) {
        if (d.data.hidden) {
          return;
        }
        event.preventDefault();
        if (d.data.isMarriage) {
          opts.callbacks.marriageRightClick.call(this, d.data.extra, d.data.id);
        } else {
          opts.callbacks.nodeRightClick.call(this, d.data.name, d.data.extra, d.data.id);
        }
      });
  }

  _flatten(root: any) {
    let n: any[] = [];
    let i = 0;

    function recurse(node: any) {
      if (node.children) {
        node.children.forEach(recurse);
      }
      if (!node.id) {
        node.id = ++i;
      }
      n.push(node);
    }
    recurse(root);
    return n;
  }

  _elbow(d: any, i: any) {
    if (d.target.data.noParent) {
      return 'M0,0L0,0';
    }
    let ny = Math.round(d.target.y + (d.source.y - d.target.y) * 0.5);

    let linedata = [
      {
        x: d.source.x,
        y: d.source.y
      },
      {
        x: d.source.x,
        y: ny
      },
      {
        x: d.target.x,
        y: ny
      },
      {
        x: d.target.x,
        y: d.target.y
      }
    ];

    return this._roundedOrthogonalPath(linedata, TreeBuilder.CONNECTOR_RADIUS);
  }

  _linkSiblings() {
    const nodeMap = new Map(this.allNodes.map((n: any) => [n.data.id, n]));

    forEach(this.siblings, function (d: any) {
      const start = nodeMap.get(d.source.id);
      const end = nodeMap.get(d.target.id);

      if (start && end) {
        d.source.x = start.x;
        d.source.y = start.y;
        d.target.x = end.x;
        d.target.y = end.y;

        const marriageId =
          start.data.marriageNode != null
            ? start.data.marriageNode.id
            : end.data.marriageNode.id;
            
        const marriageNode = nodeMap.get(marriageId);
        
        d.source.marriageNode = marriageNode;
        d.target.marriageNode = marriageNode;
      }
    });
  }

  _siblingLine(d: any, i: any) {
    let ny = Math.round(d.target.y + (d.source.y - d.target.y) * 0.5);
    let nodeWidth = this.nodeSize[0];
    let nodeHeight = this.nodeSize[1];

    // For placeholder spouses ("Add Spouse"), draw a simple straight line
    // from person to spouse via the marriage node — no offset routing that
    // could overlap real spouse cards.
    if (d.isPlaceholder) {
      let linedata = [
        { x: d.source.x, y: d.source.y },
        { x: d.target.marriageNode.x, y: d.source.y },
        { x: d.target.x, y: d.target.y }
      ];
      return line()
        .x(function (p: any) { return p.x; })
        .y(function (p: any) { return p.y; })(linedata as any);
    }

    // Determine direction of the spouse relative to the node
    let isRight = d.target.x > d.source.x;

    // For multiple marriages, alternate height to avoid overlaps.
    // d.number 0/1 are inner connections, d.number >= 2 are outer connections.
    // Outer connections are lifted with extra clearance so they don't intersect
    // top-right UI affordances (e.g. external tree icon) on neighboring spouse cards.
    if (d.number > 1) {
      const multiSpouseIndex = Math.floor(d.number / 2); // 1 for 2&3, 2 for 4&5
      const iconClearance = Math.round(nodeHeight / 2 + 16) + (multiSpouseIndex - 1) * 12;
      ny -= iconClearance;
      
      let upX = d.source.x + (isRight ? 20 + (multiSpouseIndex - 1) * 8 : -20 - (multiSpouseIndex - 1) * 8);
      
      let linedata = [
        { x: d.source.x, y: d.source.y },
        { x: upX, y: d.source.y },
        { x: upX, y: ny },
        { x: d.target.marriageNode.x, y: ny },
        { x: d.target.marriageNode.x, y: d.target.y },
        { x: d.target.x, y: d.target.y }
      ];

      return this._roundedOrthogonalPath(linedata, TreeBuilder.CONNECTOR_RADIUS);
    }

    // Determine horizontal offset from the node
    // Inner marriages (0, 1) get smaller offset
    let offsetX = (nodeWidth * 6) / 10;
    
    // Apply direction to offset
    if (!isRight) {
      offsetX *= -1;
    }

    let linedata = [
      {
        x: d.source.x,
        y: d.source.y
      },
      {
        x: Math.round(d.source.x + offsetX),
        y: d.source.y
      },
      {
        x: Math.round(d.source.x + offsetX),
        y: ny
      },
      {
        x: d.target.marriageNode.x,
        y: ny
      },
      {
        x: d.target.marriageNode.x,
        y: d.target.y
      },
      {
        x: d.target.x,
        y: d.target.y
      }
    ];

    return this._roundedOrthogonalPath(linedata, TreeBuilder.CONNECTOR_RADIUS);
  }

  _roundedOrthogonalPath(points: Array<{ x: number; y: number }>, radius: number) {
    if (!points || points.length === 0) {
      return 'M0,0';
    }
    if (points.length === 1) {
      return `M${points[0].x},${points[0].y}`;
    }

    let d = `M${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];

      const v1x = p1.x - p0.x;
      const v1y = p1.y - p0.y;
      const v2x = p2.x - p1.x;
      const v2y = p2.y - p1.y;

      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);

      if (len1 === 0 || len2 === 0) {
        d += ` L${p1.x},${p1.y}`;
        continue;
      }

      // Skip rounding on non-turns.
      const cross = v1x * v2y - v1y * v2x;
      if (Math.abs(cross) < 0.001) {
        d += ` L${p1.x},${p1.y}`;
        continue;
      }

      const rr = Math.min(radius, len1 / 2, len2 / 2);
      const u1x = v1x / len1;
      const u1y = v1y / len1;
      const u2x = v2x / len2;
      const u2y = v2y / len2;

      const p1a = { x: p1.x - u1x * rr, y: p1.y - u1y * rr };
      const p1b = { x: p1.x + u2x * rr, y: p1.y + u2y * rr };

      d += ` L${Math.round(p1a.x)},${Math.round(p1a.y)}`;
      d += ` Q${p1.x},${p1.y} ${Math.round(p1b.x)},${Math.round(p1b.y)}`;
    }

    const last = points[points.length - 1];
    d += ` L${last.x},${last.y}`;
    return d;
  }

  _renderMarriageMarkers(duration: number, siblingDelay: number) {
    const markerData = this.siblings
      .filter((s: any) => !s.isPlaceholder && s.target?.marriageNode)
      .map((s: any) => {
        const marriageNode = s.target.marriageNode;
        const relationType = marriageNode?.data?.extra?.relationType;
        const isAnniversary = marriageNode?.data?.extra?.isAnniversary === true;
        const hasDeceasedPartner =
          marriageNode?.data?.extra?.hasDeceasedPartner === true;
        const isDivorced = relationType === 'divorced';
        const stateClass = isDivorced ? 'divorced' : 'married';
        const deceasedClass = hasDeceasedPartner ? ' deceased' : '';
        const anniversaryClass =
          !isDivorced && !hasDeceasedPartner && isAnniversary ? ' anniversary' : '';

        return {
          id: marriageNode?.data?.id ?? `m-${s.source?.id}-${s.target?.id}`,
          x: marriageNode.x,
          y: marriageNode.y,
          className: `marriage-marker ${stateClass}${deceasedClass}${anniversaryClass}`,
          tooltip: anniversaryClass
            ? 'Blinking heart: today is this couple\'s anniversary.'
            : null
        };
      })
      .filter((m: any, index: number, arr: any[]) => {
        return arr.findIndex((a: any) => a.id === m.id) === index;
      });

    const markers = this.g
      .selectAll('.marriage-marker')
      .data(markerData)
      .enter()
      .append('g')
      .attr('class', (d: any) => d.className)
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('opacity', duration === 0 ? 1 : 0);

    markers
      .append('circle')
      .attr('class', (d: any) => {
        const base = d.className.includes('divorced')
          ? 'marriage-marker-circle divorced'
          : 'marriage-marker-circle married';
        const withState = d.className.includes('deceased') ? `${base} deceased` : base;
        return d.className.includes('anniversary') ? `${withState} anniversary` : withState;
      })
      .attr('r', 8);

    const iconClass = (d: any) => {
      const base = d.className.includes('divorced')
        ? 'marriage-marker-icon divorced'
        : 'marriage-marker-icon married';
      const withState = d.className.includes('deceased') ? `${base} deceased` : base;
      return d.className.includes('anniversary') ? `${withState} anniversary` : withState;
    };

    markers
      .append('path')
      .attr('class', iconClass)
      .attr('d', MARRIAGE_HEART_PATH);

    markers
      .filter((d: any) => d.className.includes('divorced'))
      .append('path')
      .attr('class', 'marriage-marker-crack')
      .attr('d', MARRIAGE_HEART_CRACK_PATH);

    markers
      .filter((d: any) => Boolean(d.tooltip))
      .append('title')
      .text((d: any) => d.tooltip);

    if (duration > 0) {
      markers
        .transition()
        .duration(duration)
        .delay(siblingDelay)
        .style('opacity', 1);
    }
  }

  static _nodeHeightSeperation(nodeWidth: number, nodeMaxHeight: number) {
    return nodeMaxHeight + 45;
  }

  static _nodeSize(
    nodes: any[],
    width: number,
    textRenderer: Function,
    nodeHeight: number = 50
  ) {
    const cardHeight = nodeHeight;

    nodes.forEach((n: any) => {
      n.cHeight = cardHeight;

      if (n.data.hidden) {
        n.cWidth = 0;
      } else {
        n.cWidth = width;
      }
    });

    return [width, cardHeight];
  }

  static _marriageSize(nodes: any[], size: number) {
    map(nodes, function (n: any) {
      if (!n.data.hidden) {
        n.cHeight = size;
        n.cWidth = size;
      }
    });

    return [size, size];
  }

  static _nodeRenderer(
    name: string,
    x: number,
    y: number,
    height: number,
    width: number,
    extra: any,
    id: string,
    nodeClass: string,
    textClass: string,
    textRenderer: Function
  ) {
    // Fallback SVG renderer (the real one is in NodeCard.tsx)
    return `<rect x="0" y="0" width="${width}" height="36" rx="10" ry="0" fill="#e0e0e0" stroke="rgba(97,97,97,0.3)" stroke-width="2"/>` +
           `<text x="${width/2}" y="18" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600">${name}</text>`;
  }

  static _textRenderer(name: string, extra: any, textClass: string) {
    // No longer used for HTML rendering - kept for compatibility
    // The SVG rendering is handled directly in renderNodeCardSvg
    return name;
  }

  static _marriageRenderer(
    x: number,
    y: number,
    height: number,
    width: number,
    extra: any,
    id: string,
    nodeClass: string
  ) {
    const r = Math.min(height, width) / 2;
    return `<circle cx="${r}" cy="${r}" r="${r}" fill="black" class="${nodeClass}" id="node${id}"/>`;
  }

  static _debug(msg: string) {
    if (TreeBuilder.DEBUG_LEVEL > 0) {
      console.log(msg);
    }
  }
}

export default TreeBuilder;
