(function (root) {
  'use strict';
  root.TarotDemo = {
    situation: {model:'marketplace',stage:'idea',question:'demand',topic:'customer_learning'},
    investor: {
      id:'fictional-harbor',name:'Fictional Harbor Seed Fund',
      models:['marketplace'],stages:['idea'],topics:['customer_learning'],
      evidence:'This invented profile explicitly lists customer learning for marketplace founders at the idea stage as an interest.',
      source:'Original fictional profile authored for this demo. No real fund or investment mandate is represented.'
    },
    snapshot: {
      id:'fictional-toolshare',name:'Fictional ToolShare Local',date:'2026-01-15',
      model:'marketplace',stage:'idea',topic:'customer_learning',
      evidence:'This invented snapshot describes a small, local tool reservation experiment. No results or customer counts are claimed.',
      source:'Original fictional snapshot authored for this demo. No real company or historical outcome is represented.'
    },
    rule:{id:'demo-demand-01',model:'marketplace',stage:'idea',question:'demand',topic:'customer_learning',
      explanation:'An authored demo rule links the situation and reservation exercise to the shared customer-learning topic. It does not assert a funding relationship or endorsement.'},
    cases:{
      both:{label:'Both connected',investor:true,snapshot:true},
      investor:{label:'Investor only',investor:true,snapshot:false},
      startup:{label:'Startup only',investor:false,snapshot:true},
      neither:{label:'Neither',investor:false,snapshot:false}
    },
    action:'Offer one narrowly scoped reservation test. Record requests, cancellations and delivery constraints before deciding whether to continue, change or stop.'
  };
}(globalThis));
