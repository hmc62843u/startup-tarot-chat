(function(root) {
  'use strict';
  function propose(base, approach) {
    var result=Object.assign({},base);
    if(base.state==='neither') {
      result.constraintReason='No records support a recommendation here. Treat the plan as your own hypothesis.';
      if(approach==='recruit') {
        result.action='Unvalidated idea to adapt: identify one place where potential customers gather and ask permission to invite a few conversations. Record whether you can reach suitable people before designing a demand test.';
        result.constraintReason='You said you cannot reach potential customers yet. No records support a recommendation here. This recruitment idea is a starting hypothesis, not an evidence-backed recommendation.';
      } else if(approach==='reachable') {
        result.action='Unvalidated idea to adapt: ask a few potential customers about the last time they faced this problem. Record concrete examples and decide what uncertainty to test next.';
        result.constraintReason='You said you can reach potential customers. No records support a recommendation here. This conversation idea is a starting hypothesis; willingness to talk does not establish demand.';
      }
    } else if(approach==='recruit') {
      result.title='First, find people you can learn from';
      result.action='Choose one place where potential customers already gather. Ask permission to invite a few people to discuss their current problem. Record responses and recruitment obstacles before proposing a reservation test.';
      result.constraintReason='You said you cannot reach potential customers yet. Recruitment is the immediate constraint; the fictional reservation example does not validate this recruitment approach.';
    } else if(approach==='reachable') {
      result.constraintReason='You said you can reach potential customers. A small reservation exercise could explore demand; willingness to talk alone does not establish demand.';
    }
    if(!result.constraintReason)result.constraintReason='This is the original scripted reservation example. Clarify customer access before adapting it to your situation.';
    return result;
  }
  root.TarotConversation={propose:propose};
}(globalThis));
