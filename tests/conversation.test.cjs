const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function fixture(key) {
  const ctx=vm.createContext({});
  for(const file of ['demo-data.js','rules.js','conversation.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  return {propose:ctx.TarotConversation.propose,base:ctx.TarotRules.evaluate(ctx.TarotDemo.situation,ctx.TarotDemo.cases[key],ctx.TarotDemo)};
}
test('customer access changes the proposal without changing evidence or the earlier proposal',()=>{
  const {propose,base}=fixture('both');
  const first=propose(base,'reachable');
  const next=propose(base,'recruit');
  assert.notEqual(first.action,next.action);
  assert.equal(first.action,base.action);
  assert.equal(next.snapshot,base.snapshot);
  assert.match(next.constraintReason,/does not validate/);
});
test('a founder constraint does not manufacture support when evidence is missing',()=>{
  const {propose,base}=fixture('neither');
  for(const approach of ['reachable','recruit']) {
    const result=propose(base,approach);
    assert.match(result.action,/Unvalidated idea to adapt/);
    assert.equal(result.title,base.title);
    assert.equal(result.state,'neither');
    assert.equal(result.investor,null);
    assert.equal(result.snapshot,null);
    assert.match(result.constraintReason,/No records support/);
  }
  const reachable=propose(base,'reachable');
  const recruit=propose(base,'recruit');
  assert.notEqual(reachable.action,recruit.action);
  assert.match(reachable.constraintReason,/can reach potential customers/);
  assert.match(recruit.constraintReason,/cannot reach potential customers/);
  assert.equal(propose(base).action,base.action);
});
