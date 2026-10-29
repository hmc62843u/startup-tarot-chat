(function () {
  'use strict';
  var data = globalThis.TarotDemo;
  var storageKey = 'startup-tarot-reference-chat-v1';
  var messages = document.getElementById('messages');
  var sessionStatus = document.getElementById('session-status');
  var roots = [];
  var activeRender = null;
  var scrollArea = document.getElementById('chat-scroll');
  var followTail = true;
  var session = {version:1,selected:'both',messages:[],plans:{},archives:[]};
  try {
    var saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && saved.version === 1 && Array.isArray(saved.messages)) {
      session.selected = data.cases[saved.selected] ? saved.selected : 'both';
      session.messages = saved.messages.filter(function(m) {
        return m && ['user','move','why','evidence','plan','help'].includes(m.kind) && data.cases[m.case] && (m.kind !== 'user' || typeof m.text === 'string');
      }).slice(-60);
      session.messages.forEach(function(m) {
        // A refresh must never silently complete a reply that was interrupted.
        if (m.status === 'streaming') m.status = 'stopped';
      });
      Object.keys(data.cases).forEach(function(key) {
        var p = saved.plans && saved.plans[key];
        if (p && typeof p.action === 'string' && typeof p.evidence === 'string' && typeof p.date === 'string') session.plans[key] = p;
      });
      if(Array.isArray(saved.archives)) {
        session.archives=saved.archives.filter(function(a){return a && typeof a.id==='string' && data.cases[a.selected] && Array.isArray(a.messages);}).slice(0,10).map(function(a){
          return {id:a.id,selected:a.selected,messages:a.messages.filter(function(m){return m && ['user','move','why','evidence','plan','help'].includes(m.kind) && data.cases[m.case] && (m.kind!=='user'||typeof m.text==='string');}).slice(-60).map(function(m){if(m.status==='streaming')m.status='stopped';return m;})};
        });
      }
    }
  } catch (_) { sessionStatus.textContent = 'Browser storage is unavailable or could not be read. This session can still be used.'; }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(session)); return true; }
    catch (_) { sessionStatus.textContent = 'Changes could not be saved in this browser. Keep this page open to retain this session.'; return false; }
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function resultFor(key) { return TarotRules.evaluate(data.situation, data.cases[key], data); }
  function buttons(selected) {
    document.querySelectorAll('[data-scenario]').forEach(function(b) { b.setAttribute('aria-pressed',String(b.dataset.scenario === selected)); });
  }
  function updateShell() {document.querySelector('.welcome').hidden=session.messages.length>0;}
  function scrollToLatest(force) {
    if(force)followTail=true;
    requestAnimationFrame(function(){if(followTail)scrollArea.scrollTop=scrollArea.scrollHeight;});
  }
  scrollArea.addEventListener('scroll',function(){followTail=scrollArea.scrollHeight-scrollArea.scrollTop-scrollArea.clientHeight<100;});
  function archiveCurrent() {
    if(!session.messages.length)return;
    session.archives.unshift({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),selected:session.selected,messages:JSON.parse(JSON.stringify(session.messages))});
    session.archives=session.archives.slice(0,10);
  }
  function showHistory() {
    var list=document.getElementById('history-list');list.replaceChildren();
    if(!session.archives.length)list.append(el('p','fine-print','No previous chats yet. New chat saves the current conversation here.'));
    session.archives.forEach(function(archive){
      var first=archive.messages.find(function(m){return m.kind==='user';});
      var button=el('button','history-item');button.type='button';button.dataset.archive=archive.id;
      button.append(el('span','',first?first.text:'Saved conversation'),el('small','',data.cases[archive.selected].label+' · '+archive.messages.length+' messages'));
      button.addEventListener('click',function(){
        if(activeRender)activeRender.cancel();
        archiveCurrent();session.archives=session.archives.filter(function(a){return a.id!==archive.id;});
        session.messages=JSON.parse(JSON.stringify(archive.messages));session.selected=archive.selected;
        redraw();persist();document.getElementById('history-dialog').close();scrollToLatest(true);
      });list.append(button);
    });
    document.getElementById('history-dialog').showModal();
  }
  function setBusy(busy) {
    document.querySelectorAll('[data-scenario], .followups button, #send-message').forEach(function(b) { b.disabled = busy; });
    document.getElementById('send-message').hidden = busy;
    document.getElementById('stop-response').hidden = !busy;
  }
  function renderOpenUI(container, title, subtitle, sections, message, stream, finished) {
    var children = ['heading'];
    var program = ['heading = CardHeader(' + JSON.stringify(title) + ', ' + JSON.stringify(subtitle) + ')'];
    sections.forEach(function(section, index) {
      if (section.title) {
        children.push('heading' + index);
        program.push('heading' + index + ' = CardHeader(' + JSON.stringify(section.title) + ')');
      }
      children.push('text' + index);
      program.push('text' + index + ' = TextContent(' + JSON.stringify(section.text) + ')');
    });
    var article = container.closest('article');
    var status = el('p','stream-status'); status.setAttribute('role','status');
    article.append(status);
    var limit = message.status === 'stopped' ? Math.max(1, Math.min(program.length, Number(message.visibleParts) || 1)) : program.length;
    var ui = window.__OpenUI;
    var root = ui ? ui.createRoot(container) : null;
    if (root) roots.push(root);
    var error = el('p','render-error'); error.hidden = true;
    container.after(error);
    if (!ui) {error.hidden=false;error.textContent='OpenUI could not load. Showing the same evidence as plain text.';}
    function paint(count, streaming) {
      // Only reference delivered statements: stopped replies remain valid programs.
      var response = 'root = Card([' + children.slice(0,count).join(', ') + '])\n' + program.slice(0,count).join('\n');
      if(root) {
        root.render(ui.React.createElement(ui.Renderer,{
          response:response,library:ui.openuiChatLibrary,isStreaming:streaming,
          onError:function(errors) {error.hidden = !errors.length;error.textContent = errors.map(function(e){return e.message || e.code;}).join('; ');}
        }));
      } else {
        container.replaceChildren(el('h2','',title),el('p','fine-print',subtitle));
        var used=1;
        sections.forEach(function(s) {
          if(s.title) {if(used<count)container.append(el('h3','',s.title));used++;}
          if(used<count)container.append(el('p','',s.text));used++;
        });
      }
      scrollToLatest(false);
    }
    function mark(state) {
      article.dataset.delivery=state;
      article.setAttribute('aria-busy',String(state==='streaming'));
      status.dataset.state=state;
      status.textContent=state==='streaming'?'Rendering scripted demo response…':state==='stopped'?'Stopped · partial demo response':'Demo response complete';
    }
    if(!stream) {
      paint(limit,false);mark(message.status==='stopped'?'stopped':'complete');
      if(message.status!=='stopped')finished();
      return;
    }
    var delivered=1;
    var timer;
    var controller = new AbortController();
    var job = {cancel:function(){controller.abort();}};
    activeRender=job;setBusy(true);mark('streaming');
    message.status='streaming';message.visibleParts=delivered;
    paint(delivered,true);persist();
    function settle(stopped) {
      clearTimeout(timer);
      message.status=stopped?'stopped':'complete';
      message.visibleParts=delivered;
      paint(delivered,false);mark(message.status);
      if(activeRender===job){activeRender=null;setBusy(false);}
      if(!stopped)finished();
      persist();
    }
    controller.signal.addEventListener('abort',function(){settle(true);},{once:true});
    function pump() {
      if(controller.signal.aborted)return;
      delivered++;message.visibleParts=delivered;
      if(delivered===program.length){settle(false);return;}
      paint(delivered,true);persist();
      timer=setTimeout(pump,120);
    }
    // Fixture playback, explicitly labelled in the UI; no model or fake thinking.
    timer=setTimeout(pump,120);
  }
  function followups(container,key) {
    var row = el('div','followups');
    [['Why this move?','why'],['Review evidence','evidence'],['Make a plan','plan']].forEach(function(pair) {
      var b = el('button','',pair[0]); b.type = 'button';
      b.addEventListener('click',function(){request(pair[0],pair[1],key);});row.append(b);
    });
    container.append(row);
  }
  function planForm(container,key,result) {
    var form = el('form','plan-form');
    form.dataset.plan = key;
    form.append(el('h2','','Plan a small test'));
    var plan = session.plans[key] || {action:result.action,evidence:'',date:''};
    [['What will you try?','action','textarea'],['What will you look for?','evidence','textarea'],['When will you review it?','date','input']].forEach(function(field) {
      var label=el('label','',field[0]);var input=el(field[2]);input.name=field[1];
      if(field[1]==='date') input.type='date';
      else {input.required=true;input.maxLength=3000;}
      input.value=plan[field[1]];label.append(input);form.append(label);
    });
    var actions=el('div','plan-actions');var save=el('button','primary','Save plan');save.type='submit';
    var status=el('span','fine-print',session.plans[key]?'Saved plan loaded.':'');status.setAttribute('role','status');
    actions.append(save,status);form.append(actions);
    form.addEventListener('input',function(){status.textContent='Unsaved changes.';});
    form.addEventListener('submit',function(event){event.preventDefault();session.plans[key]={action:form.elements.namedItem('action').value,evidence:form.elements.namedItem('evidence').value,date:form.elements.namedItem('date').value};if(persist())status.textContent='Plan saved in this browser.';else status.textContent='Plan could not be saved.';});
    container.append(form);
  }
  function display(message, stream) {
    var article=el('article','message '+(message.kind==='user'?'user':'assistant'));
    article.dataset.kind=message.kind;article.dataset.case=message.case;
    if(message.kind==='user'){article.append(el('p','',message.text));messages.append(article);return article;}
    article.append(el('div','speaker','Startup Tarot · '+data.cases[message.case].label));
    messages.append(article);
    var result=resultFor(message.case);
    if(message.kind==='plan'){planForm(article,message.case,result);return article;}
    var output=el('div','response');article.append(output);
    var subtitle='Fictional records · '+data.cases[message.case].label;
    function completed() {followups(article,message.case);}
    if(message.kind==='move') {
      renderOpenUI(output,result.title,subtitle,[{text:result.action},{title:'Evidence available',text:(result.investor?'Investor interest is documented in the demo. ':'No investor interest is documented in this case. ')+(result.snapshot?'A startup snapshot is available.':'No startup snapshot is available.')},{title:'Why it appears',text:result.rationale}],message,stream,completed);
    } else if(message.kind==='why') {
      renderOpenUI(output,'Why this move appears',subtitle,[{text:'Your demo situation: marketplace · idea stage · demand question.'},{text:result.rationale},{title:'Rule used',text:result.ruleId || 'No matching rule.'},{text:'Relevance does not establish funding, endorsement or what caused an outcome.'}],message,stream,completed);
    } else if(message.kind==='evidence') {
      var sections=[];
      if(result.investor) sections.push({title:result.investor.name,text:result.investor.evidence+' Source ID: '+result.investor.id+'. '+result.investor.source});
      else sections.push({title:'Investor evidence',text:'No matching investor interest is documented in this case.'});
      if(result.snapshot) sections.push({title:result.snapshot.name+' · '+result.snapshot.date,text:result.snapshot.evidence+' Source ID: '+result.snapshot.id+'. '+result.snapshot.source});
      else sections.push({title:'Startup evidence',text:'No supporting startup snapshot is available in this case.'});
      sections.push({title:'Connection',text:result.rationale});
      renderOpenUI(output,'Review the evidence',subtitle,sections,message,stream,completed);
    } else {
      renderOpenUI(output,'What would you like to explore?','Guided demo',[{text:'Choose a fictional evidence case above, or ask “why”, “evidence” or “plan”. The examples use a marketplace at the idea stage with a demand question.'},{text:'Free-form descriptions are not matched by a language model in this version.'}],message,stream,completed);
    }
    return article;
  }
  function append(message, stream) {
    session.messages.push(message);
    if(session.messages.length>60) {session.messages=session.messages.slice(-60);redraw(message,stream);}
    else display(message,stream);
  }
  function request(text,kind,key) {
    if(activeRender)return;
    key=key || session.selected;
    session.selected=key;buttons(key);
    append({kind:'user',case:key,text:text.slice(0,1000)});
    updateShell();
    append({kind:kind,case:key},kind!=='plan');persist();
    scrollToLatest(true);
  }
  function redraw(liveMessage, stream) {roots.forEach(function(r){r.unmount();});roots=[];messages.replaceChildren();session.messages.forEach(function(m){display(m,m===liveMessage && stream);});buttons(session.selected);updateShell();scrollToLatest(true);}
  document.querySelectorAll('[data-scenario]').forEach(function(button){button.addEventListener('click',function(){var key=button.dataset.scenario;request('Show the '+data.cases[key].label.toLowerCase()+' case for a marketplace at the idea stage, testing demand.','move',key);});});
  document.getElementById('composer').addEventListener('submit',function(event){
    event.preventDefault();if(activeRender)return;var input=document.getElementById('message');var text=input.value.trim();if(!text)return;input.value='';
    var lower=text.toLowerCase();var key=session.selected;var kind='help';
    if(/\bneither\b/.test(lower)){key='neither';kind='move';}
    else if(/\binvestor only\b/.test(lower)){key='investor';kind='move';}
    else if(/\bstartup only\b/.test(lower)){key='startup';kind='move';}
    else if(/\bboth\b/.test(lower)){key='both';kind='move';}
    else if(/\b(why|fit|connect|reason)\b/.test(lower))kind='why';
    else if(/\b(evidence|sources?|investors?|snapshots?|startups?)\b/.test(lower))kind='evidence';
    else if(/\b(plan|test|experiment)\b/.test(lower))kind='plan';
    else if(/\b(marketplace|demand|reservation)\b/.test(lower))kind='move';
    request(text,kind,key);
  });
  document.getElementById('stop-response').addEventListener('click',function(){if(activeRender)activeRender.cancel();document.getElementById('message').focus();});
  document.getElementById('new-chat').addEventListener('click',function(){if(activeRender)activeRender.cancel();archiveCurrent();session.messages=[];session.selected='both';redraw();persist();document.getElementById('message').value='';document.getElementById('message').focus();scrollArea.scrollTop=0;});
  document.getElementById('history-toggle').addEventListener('click',showHistory);
  document.getElementById('history-close').addEventListener('click',function(){document.getElementById('history-dialog').close();});
  window.addEventListener('pagehide',function(){if(activeRender)activeRender.cancel();});
  redraw();
}());
