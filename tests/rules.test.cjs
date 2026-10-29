const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  const context = vm.createContext({});
  for (const name of ['demo-data.js', 'rules.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context);
  }
  return {data:context.TarotDemo,evaluate:context.TarotRules.evaluate};
}

for (const state of ['both','investor','startup','neither']) {
  test('available evidence produces the '+state+' state', () => {
    const {data,evaluate}=fixture();
    const result=evaluate(data.situation,data.cases[state],data);
    assert.equal(result.state,state);
    assert.equal(Boolean(result.investor),state==='both'||state==='investor');
    assert.equal(Boolean(result.snapshot),state==='both'||state==='startup');
  });
}

for(const field of ['model','stage','question']) {
  test('an unmatched '+field+' cannot produce a recommendation', () => {
    const {data,evaluate}=fixture();
    const result=evaluate({...data.situation,[field]:'unmatched'},data.cases.both,data);
    assert.equal(result.state,'neither');
    assert.equal(result.ruleId,null);
    assert.equal(result.title,'Draft your own learning test');
  });
}

test('stage and model compatibility alone do not establish investor interest', () => {
  const {data,evaluate}=fixture();data.investor.topics=['hiring'];
  assert.equal(evaluate(data.situation,data.cases.both,data).state,'startup');
});

test('an unrelated snapshot cannot create a full connection', () => {
  const {data,evaluate}=fixture();data.snapshot.topic='hiring';
  assert.equal(evaluate(data.situation,data.cases.both,data).state,'investor');
});

test('no shared evidence yields an explicit unsupported state', () => {
  const {data,evaluate}=fixture();data.investor.topics=[];data.snapshot.topic='hiring';
  const result=evaluate(data.situation,data.cases.both,data);
  assert.equal(result.state,'neither');
  assert.match(result.rationale,/does not support a recommendation/);
});
