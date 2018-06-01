export function partition (array, classifier) {
  let classes = {};
  array.forEach(d => {
    let class_ = classifier(d);
    let target = classes[class_] = classes[class_] || [];

    target.push(d);
  });

  return classes;
}
