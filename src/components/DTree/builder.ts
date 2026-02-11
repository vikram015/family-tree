import * as d3 from 'd3';
import _ from 'lodash';

class TreeBuilder {
  static DEBUG_LEVEL = 0;
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
      _.filter(
        this.allNodes,
        (node: any) => !(node.hidden || _.get(node, 'data.isMarriage'))
      ),
      opts.nodeWidth,
      opts.callbacks.textRenderer
    );
    this.marriageSize = opts.callbacks.marriageSize.call(
      this,
      // filter hidden and non marriage nodes
      _.filter(
        this.allNodes,
        (node: any) => !node.hidden && _.get(node, 'data.isMarriage')
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

    const zoom = (this.zoom = d3
      .zoom()
      .scaleExtent([0.1, 10])
      // Optimize filter: Only allow left mouse button or touch (ignore right-click)
      .filter(function(event) {
        return !event.button || event.button === 0;
      })
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      }));

    // make a svg
    const svg = (this.svg = d3
      .select(opts.target)
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
      d3.zoomIdentity.translate(width / 2, opts.margin.top).scale(1)
    );

    // Compute the layout.
    this.tree = d3
      .tree()
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
      .attr('class', opts.styles.linage)
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
      .attr('class', opts.styles.marriage)
      .attr('d', this._siblingLine.bind(this))
      .style('opacity', duration === 0 ? 1 : 0);

    if (duration > 0) {
      siblingPaths
        .transition()
        .duration(duration)
        .delay(siblingDelay)
        .style('opacity', 1);
    }

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
      .on('dblclick', function (event) {
        // do not propagate a double click on a node
        // to prevent the zoom from being triggered
        event.stopPropagation();
      })
      .on('click', function (event, d: any) {
        // ignore double-clicks and clicks on hidden nodes
        if (event.detail === 2 || d.data.hidden) {
          return;
        }
        if (d.data.isMarriage) {
          opts.callbacks.marriageClick.call(this, d.data.extra, d.data.id);
        } else {
          opts.callbacks.nodeClick.call(this, d.data.name, d.data.extra, d.data.id);
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
        x: d.target.x,
        y: d.target.y
      },
      {
        x: d.target.x,
        y: ny
      },
      {
        x: d.source.x,
        y: d.source.y
      }
    ];

    let fun = d3
      .line()
      .curve(d3.curveStepAfter)
      .x(function (d: any) {
        return d.x;
      })
      .y(function (d: any) {
        return d.y;
      });
    return fun(linedata as any);
  }

  _linkSiblings() {
    const nodeMap = new Map(this.allNodes.map((n: any) => [n.data.id, n]));

    _.forEach(this.siblings, function (d: any) {
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

    // Determine direction of the spouse relative to the node
    let isRight = d.target.x > d.source.x;

    // For multiple marriages, alternate height to avoid overlaps
    // d.number 0 (Right) and 1 (Left) are "Inner" marriages (close to node)
    // d.number 2 (Right) and 3 (Left) are "Outer" marriages (farther)
    // We lift the connection line for outer marriages
    if (d.number > 1) {
      ny -= Math.round((nodeHeight * 6) / 10);
    }

    // Determine horizontal offset from the node
    // Inner marriages (0, 1) get smaller offset, Outer (2, 3...) get larger offset
    let offsetX = d.number > 1 ? (nodeWidth * 8) / 10 : (nodeWidth * 6) / 10;
    
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

    let fun = d3
      .line()
      .curve(d3.curveStepAfter)
      .x(function (d: any) {
        return d.x;
      })
      .y(function (d: any) {
        return d.y;
      });
    return fun(linedata as any);
  }

  static _nodeHeightSeperation(nodeWidth: number, nodeMaxHeight: number) {
    return nodeMaxHeight + 25;
  }

  static _nodeSize(nodes: any[], width: number, textRenderer: Function) {
    let maxHeight = 0;

    // Pure SVG approach: Calculate size based on text length estimation.
    // No need for DOM measurement since we're not using HTML/foreignObject.
    // Font: 14px, weight 600, 'Segoe UI' → approx 7.5px per character
    const charWidth = 7.5;
    const fontSize = 14;
    const paddingX = 24; // 12px padding each side
    const paddingY = 16; // 8px padding each side
    const iconWidth = 20; // gender icon width + gap
    const minHeight = 36;

    nodes.forEach((n: any) => {
      const name = n.data.name || '';
      const gender = n.data.extra?.gender || '';
      const hasIcon = gender === 'male' || gender === 'female';
      
      // Calculate text width
      const textWidth = name.length * charWidth;
      const contentWidth = textWidth + (hasIcon ? iconWidth : 0) + paddingX;
      
      // Height is fixed (single line text with padding)
      const height = Math.max(minHeight, fontSize + paddingY);
      
      maxHeight = Math.max(maxHeight, height);
      n.cHeight = height;

      if (n.data.hidden) {
        n.cWidth = 0;
      } else {
        // Use the configured width (capped at node width)
        n.cWidth = width;
      }
    });

    return [width, maxHeight];
  }

  static _marriageSize(nodes: any[], size: number) {
    _.map(nodes, function (n: any) {
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