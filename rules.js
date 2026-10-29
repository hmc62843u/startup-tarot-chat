(function(root) {
  'use strict';
  function evaluate(situation, available, data) {
    var rule = data.rule;
    var contextMatches = ['model','stage','question'].every(function(field) {return situation[field] === rule[field];});
    var investor = available.investor && contextMatches && data.investor.models.includes(situation.model) && data.investor.stages.includes(situation.stage) && data.investor.topics.includes(rule.topic) ? data.investor : null;
    var snapshot = available.snapshot && contextMatches && data.snapshot.model === situation.model && data.snapshot.stage === situation.stage && data.snapshot.topic === rule.topic ? data.snapshot : null;
    var state = investor && snapshot ? 'both' : investor ? 'investor' : snapshot ? 'startup' : 'neither';
    var rationale = {
      both:rule.explanation,
      investor:'The fictional investor profile names a relevant topic. There is no supporting startup snapshot in this case, so no investor-to-startup connection is asserted.',
      startup:'The fictional startup snapshot supports exploring the exercise. No matching investor interest is documented in this case.',
      neither:'This case has no supporting investor interest or startup snapshot. You can draft your own learning test; the library does not support a recommendation here.'
    };
    return {state:state,investor:investor,snapshot:snapshot,ruleId:contextMatches ? rule.id : null,
      title:state === 'neither' ? 'Draft your own learning test' : 'Try a small reservation test',
      action:state === 'neither' ? 'Write one uncertainty, one safe action and the evidence you would need to make a decision.' : data.action,
      rationale:rationale[state]};
  }
  root.TarotRules = {evaluate:evaluate};
}(globalThis));
