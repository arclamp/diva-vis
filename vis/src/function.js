export class Function {
  evaluate (x) {
    throw new Error('abstract virtual');
  }
}

export class PointInterpolator extends Function {
  constructor (points, x, y) {
    super(...arguments);

    this.points = points
      .map(d => ({x: d[x], y: d[y]}))
      .sort((a, b) => a.x - b.x);
  }

  findInterpPoint (x) {
    // Don't bother to extrapolate.
    if (x < this.points[0].x || x > this.points[this.points.length - 1].x) {
      return null;
    }

    // Find the position in the points array to interpolate from.
    let i;
    for(i = 0; i < this.points.length - 1; i++) {
      if (x >= this.points[i].x && x < this.points[i + 1].x) {
        break;
      }
    }

    return i;
  }
}

export class LinearPoints extends PointInterpolator {
  constructor (points, x, y) {
    super(points, x, y);
  }

  evaluate (x) {
    // Don't bother to extrapolate.
    if (x < this.points[0].x || x > this.points[this.points.length - 1].x) {
      return null;
    }

    // Find the position in the points array to interpolate from.
    const i = this.findInterpPoint(x);

    // Interpolate the function value.
    if (i !== null) {
      const t = x - this.points[i].x;
      const slope = (this.points[i + 1].y - this.points[i].y) / (+this.points[i + 1].x - +this.points[i].x);
      return this.points[i].y + t * slope;
    } else {
      return null;
    }
  }
}

export class StepPoints extends PointInterpolator {
  constructor (points, x, y) {
    super(points, x, y);
  }

  evaluate (x) {
    // Find the position in the points array to interpolate from.
    const i = this.findInterpPoint(x);

    // Interpolate the function value.
    if (i !== null) {
      return this.points[i].y;
    } else {
      return null;
    }
  }
}

export class LineSegment extends Function {
  constructor (p1, p2, x, y, bounds = {low: -Infinity, high: Infinity}) {
    this.slope = (p2[y] - p1[y]) / (p2[x] - p1[x]);
    this.intercept = (p2[x] * p1[y] - p1[x] * p2[y]) / (p2[x] - p1[x]);
    this.bounds = bounds;
  }

  evaluate (x) {
    if (x < this.bounds.low || x > this.bounds.high) {
      return null;
    }

    return this.slope * x + this.intercept;
  }
}
