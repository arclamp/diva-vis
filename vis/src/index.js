function newDiv (id) {
  const div = document.createElement('div')
  div.setAttribute('id', id);

  document.body.appendChild(div);
  return div;
}

async function getData () {
  const req = await fetch('diva.json');
  return await req.json();
}

(async function () {
  const data = await getData();

  const el = newDiv('vis');
  const vis = new candela.components.ScatterPlot(el, {
    data,
    x: 'Frames',
    y: 'Annotation Time (/spend)',
    color: 'Annotator',
    width: 960,
    height: 540
  });
  vis.render();
}());
