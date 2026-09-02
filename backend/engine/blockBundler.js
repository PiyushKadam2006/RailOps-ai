const bundleDefects = (defects) => {
  const grouped = {};
  defects.forEach(d => {
    const key = `${d.corridorId}_${d.department}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  const bundles = [];
  let bId = 1;

  for (const key in grouped) {
    if (grouped[key].length >= 2) {
      const bDefects = grouped[key];
      // Note: we assume the caller will save the 'BUNDLED' status to DB if needed
      bDefects.forEach(d => d.status = 'BUNDLED');
      
      const totalDuration = bDefects.reduce((acc, d) => acc + d.estimatedDurationHrs, 0);
      const suggestedStart = new Date();
      suggestedStart.setHours(suggestedStart.getHours() + 2); // 2 hrs from now
      const suggestedEnd = new Date(suggestedStart.getTime() + (totalDuration * 3600000));

      bundles.push({
        bundleId: `BNDL-${bId++}`,
        corridorId: bDefects[0].corridorId,
        department: bDefects[0].department,
        defects: bDefects,
        suggestedStart,
        suggestedEnd,
        totalDurationHrs: totalDuration
      });
    }
  }

  return bundles;
};

module.exports = { bundleDefects };
