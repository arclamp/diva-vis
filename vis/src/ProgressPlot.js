import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { arc } from 'd3-shape';
import { scaleOrdinal,
         scaleLinear } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

const tau = 2 * Math.PI;

function rad2deg (r) {
  return r / tau * 360;
}

function computeArcData (progress) {
  // Compute the sum of all the progress categories.
  const sum = progress.reduce((a, c) => a + c, 0);

  // Compute a subtending angle for each progress value.
  const subtends = progress.map(x => x * tau / sum);

  // Compute start angles for each progress segment.
  let angles = [0];
  subtends.forEach(d => {
    angles.push(angles[angles.length - 1] + d);
  });

  return angles;
}

export class ProgressPlot extends VisComponent {
  constructor (el, options) {
    super(el);

    this.data = options.data;
    this.size = options.size;

    this.donutWidth = this.size / 8;
    this.outerRadius = this.size / 2 - 5;
    this.innerRadius = this.outerRadius - this.donutWidth;

    this.svg = select(this.el)
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', this.size)
      .attr('height', this.size);
  }

  render () {
    const arcData = computeArcData(this.data.progress);

    let arcs = [];
    for (let i = 0; i < arcData.length - 1; i++) {
      console.log(this.innerRadius, this.outerRadius, arcData[i], arcData[i + 1]);
      arcs.push(arc()
        .innerRadius(this.innerRadius)
        .outerRadius(this.outerRadius)
        .startAngle(arcData[i])
        .endAngle(arcData[i + 1]));
    }

    const colormap = scaleOrdinal(schemeCategory10);

    this.svg.append('g')
      .attr('transform', `translate(${this.size / 2} ${this.size / 2})`)
      .selectAll('path.progress')
      .data(arcs.map(d => d()))
      .enter()
      .append('path')
      .classed('progress', true)
      .attr('d', d => d)
      .attr('fill', (d, i) => colormap(i));

    const dial = this.svg.append('g')
      .attr('transform', `translate(${this.size / 2} ${this.size / 2})`);

    const scale = arc()
      .innerRadius(this.innerRadius - 5)
      .outerRadius(this.innerRadius - 7)
      .startAngle(-tau / 3)
      .endAngle(tau / 3);

    dial.append('path')
      .attr('d', scale())
      .attr('fill', 'black')
      .attr('stroke', 'black');

    const tickScale = scaleLinear()
      .domain([0, 1])
      .range([-tau / 3, tau / 3]);

    const tickStops = [...Array(11).keys()].map(d => d / 10);

    dial.append('g')
      .classed('ticks', true)
      .selectAll('line.tick')
      .data(tickStops)
      .enter()
      .append('line')
      .classed('tick', true)
      .attr('x1', 0)
      .attr('y1', -(this.innerRadius - 5))
      .attr('x2', 0)
      .attr('y2', -(this.innerRadius - 12))
      .attr('transform', d => `rotate(${rad2deg(tickScale(d))})`)
      .attr('stroke', 'black')
      .attr('stroke-width', '2px');

    let needle = dial.append('g')
      .classed('needle', true);

    needle.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 4)
      .style('stroke', 'black')
      .style('fill', 'black');

    needle.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', -(this.innerRadius - 20))
      .attr('stroke', 'black')
      .attr('transform', `rotate(${rad2deg(tickScale(this.data.speed))})`);
  }
}
