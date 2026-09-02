const scoreDefect = (defect) => {
  let baseScore = 0;
  if (defect.priority === 'CRITICAL') baseScore = 90;
  else if (defect.priority === 'HIGH') baseScore = 70;
  else if (defect.priority === 'MEDIUM') baseScore = 45;
  else baseScore = 20;

  const hoursSince = (Date.now() - new Date(defect.createdAt).getTime()) / 3600000;
  const ageBonus = Math.min(15, Math.floor(hoursSince));

  let deptWeight = 2;
  if (defect.department === 'Signalling') deptWeight = 8;
  else if (defect.department === 'Traction') deptWeight = 6;
  else if (defect.department === 'Track') deptWeight = 4;

  let sourceWeight = 0;
  if (defect.source === 'TDMS') sourceWeight = 5;
  else if (defect.source === 'SMMS') sourceWeight = 4;
  else if (defect.source === 'TMS') sourceWeight = 3;
  else if (defect.source === 'COA') sourceWeight = 2;
  else if (defect.source === 'BDMS') sourceWeight = 1;

  return Math.min(100, Math.round(baseScore + ageBonus + deptWeight + sourceWeight));
};

module.exports = { scoreDefect };
