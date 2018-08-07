import { BarChart, ScatterPlot } from '@candela/vega';
import data from './diva.json';
import { BoxPlot } from './BoxPlot';
import { ProgressPlot } from './ProgressPlot';
import { BurndownPlot } from './BurnPlots/BurndownPlot';
import { BurnupPlot } from './BurnPlots/BurnupPlot';

import { partition } from './util';

function newDiv (id) {
  const div = document.createElement('div')
  div.setAttribute('id', id);

  document.body.appendChild(div);
  return div;
}

function process (data) {
  data.forEach(d => {
    d['Audit Time (/estimate)'] /= 3600;
    d['Annotation Time (/spend)'] /= 3600;

    d['Audit Burden'] = d['Audit Time (/estimate)'] / d['Annotation Time (/spend)'];
    d['Annotation Speed'] = d['Frames'] / d['Annotation Time (/spend)'];
    d['Audit Speed'] = d['Frames'] / d['Audit Time (/estimate)'];

    d['Annotation Speed'] = d['Frames'] / d['Annotation Time (/spend)'];
    d['Audit Speed'] = d['Frames'] / d['Audit Time (/estimate)'];
  });
}

function fieldSum (data, field) {
  return data.map(d => d[field]).reduce((a, cur) => a + cur, 0);
}

function derived (data) {
  let taters = {};
  data.forEach(d => {
    taters[d.Annotator] = taters[d.Annotator] || {data: [], derived: {}};
    taters[d.Annotator].data.push(d);
  });

  for (let tater in taters) {
    let dat = taters[tater].data;
    let der = taters[tater].derived;

    der['Average Annotation Time'] = dat.map(d => d['Annotation Time (/spend)']).reduce((a, cur) => a + cur, 0) / dat.length;
    der['Average Annotation Speed'] = fieldSum(dat, 'Frames') / fieldSum(dat, 'Annotation Time (/spend)')
  }

  let table = [];
  for (let tater in taters) {
    let record = {
      Annotator: tater
    };

    for (let field in taters[tater].derived) {
      record[field] = taters[tater].derived[field];
    }

    table.push(record);
  }

  return table;
}

function progress (data) {
  const diva = data.filter(d => d.Project === 'DIVA');
  const classes = partition(diva, d => d.Status);

  const closedFrames = fieldSum(classes.closed, 'Frames');
  const closedAnnTime = fieldSum(classes.closed, 'Annotation Time (/spend)');
  const closedAuditTime = fieldSum(classes.closed, 'Audit Time (/estimate)');

  const openedFrames = fieldSum(classes.opened, 'Frames');
  const auditFrames = fieldSum(classes.audit, 'Frames');

  return {
    openedFrames,
    auditFrames,
    closedFrames,
    closedAuditTime,
    closedAnnTime
  };
}

let table = {};
let dlLink = document.createElement('a');

function register (id, vis) {
  table[id] = vis;
}

async function dump (id, filename) {
  const vis = table[id];
  const data = await vis.serialize('png');
  dlLink.setAttribute('download', `${filename}.png`);
  dlLink.setAttribute('href', data);
  dlLink.click();
}

function dumpAll () {
  return Promise.all(Object.keys(table).map(id => dump(id, id)));
}

window.dump = dump;
window.dumpAll = dumpAll;

function scatterPlot(id, data, x, y, color) {
  let vis = new ScatterPlot(newDiv(id), {
    data,
    x,
    y,
    color,
    width: 960,
    height: 540
  });
  vis.render();
  register(id, vis);
  return vis;
}

function barChart(id, data, x, y, color) {
  let vis = new BarChart(newDiv(id), {
    data,
    x,
    y,
    color,
    width: 960,
    height: 540
  });
  vis.render();
  register(id, vis);
  return vis;
}

function boxPlot(id, data, splitter, field) {
  let vis = new BoxPlot(newDiv(id), {
    data,
    splitter,
    field,
    bodywidth: 'variable'
  });
  vis.render();
  register(id, vis);
  return vis;
}

function distributionPlot(id, origData, distField, color) {
  // Make a copy of the data and sort it by the chosen field.
  let data = origData.map(x => Object.assign({}, x));
  data.sort((a, b) => a[distField] - b[distField]);

  // Adjoin an index field now that the data is sorted.
  data = data.map((d, i) => Object.assign(d, {index: i}));

  // Now create a scatter plot based on this modified dataset.
  return scatterPlot(id, data, 'index', distField, color);
}

function progressPlot (config) {
  let v = new ProgressPlot(document.body.appendChild(document.createElement('div')), config);
  v.render();

  return v;
}

function burndownPlot (config) {
  let v = new BurndownPlot(document.body.appendChild(document.createElement('div')), config);
  v.render();

  return v;
}

function burnupPlot (config) {
  let v = new BurnupPlot(document.body.appendChild(document.createElement('div')), config);
  v.setAverageStart('a', {x: new Date('2018-06-02'), y: 8});
  v.render();

  return v;
}

function burnupPlot2 (config) {
  let v = new BurnupPlot2(document.body.appendChild(document.createElement('div')), config);
  v.render();

  return v;
}

function examplePlot (config) {
  let v = new Example(document.body.appendChild(document.createElement('div')), config);
  v.render();

  return v;
}

process(data);

// scatterPlot('vis1', data, 'Frames', 'Annotation Time (/spend)', 'Annotator');
// scatterPlot('vis2', data, 'Annotation Time (/spend)', 'Audit Time (/estimate)', 'Annotator');

// scatterPlot('vis3', data, 'Annotation Time (/spend)', 'Audit Burden', 'Annotator');
// scatterPlot('vis4', data, 'Frames', 'Annotation Speed', 'Annotator');

// const der = derived(data);
// console.log('derived', der);

// barChart('vis5', der, 'Annotator', 'Average Annotation Time', 'Annotator');
// barChart('vis6', der, 'Annotator', 'Average Annotation Speed', 'Annotator');

// distributionPlot('vis7', data, 'Annotation Time (/spend)', 'Annotator');
// distributionPlot('vis8', data, 'Audit Time (/estimate)', 'Auditor');
// distributionPlot('vis9', data, 'Annotation Speed', 'Annotator');
// distributionPlot('vis10', data, 'Audit Speed', 'Auditor');

// boxPlot('vis11', data, 'Annotator', 'Annotation Speed');
// boxPlot('vis12', data, 'Auditor', 'Audit Speed');
// boxPlot('vis13', data, 'Scene ID', 'Annotation Speed');
// boxPlot('vis14', data, 'Scene ID', 'Audit Speed');

const progressData = progress(data);

// console.log(progressData);

// progressPlot({
  // data: {
    // progress: [
      // progressData.closedFrames,
      // progressData.auditFrames,
      // progressData.openedFrames
    // ],
    // speed: (progressData.closedFrames / (progressData.closedAnnTime + progressData.closedAuditTime))
  // },
  // speedRange: [0, 1500],
  // size: 250
// });

const burndownConfig = {
  data: [
    {t: new Date('2018-06-01T00:00:00'), a: 100 / 4, b: 51},
    {t: new Date('2018-06-02T00:00:00'), a: 90 / 4, b: 41},
    {t: new Date('2018-06-03T00:00:00'), a: 90 / 4, b: 37, b_count: 60},
    {t: new Date('2018-06-04T00:00:00'), a: 84 / 4, b: 32},
    {t: new Date('2018-06-05T00:00:00'), a: 38 / 4, b: 31, b_count: 80},
    {t: new Date('2018-06-06T00:00:00'), a: 30 / 4, b: 22}
  ],
  timeIndex: 't',
  series: ['a', 'b'],
  finishDate: new Date('2018-06-10')
};
// burndownPlot(burnConfig);

const burnupConfig = {
  data: [
    {t: new Date('2018-06-01T00:00:00'), a: 0, b: 0, goal: 51},
    {t: new Date('2018-06-02T00:00:00'), a: 2, a_note: "I don't have to show you any stinking badges.", b: 38},
    {t: new Date('2018-06-03T00:00:00'), a: 2, b: 42, goal: 60, goal_note: "Forget it Jake. It's Chinatown"},
    {t: new Date('2018-06-04T00:00:00'), a: 4, b: 48},
    {t: new Date('2018-06-05T00:00:00'), a: 15, a_note: "No. *I* am your father!", b: 49, b_note: "They call me MISTER Tibbs!", goal: 80},
    {t: new Date('2018-06-06T00:00:00'), a: 17, b: 58}
  ],
  timeIndex: 't',
  series: ['a', 'b'],
  goal: 'goal',
  finishDate: new Date('2018-06-10')
};
burnupPlot(burnupConfig);
