/* SchoolDesk teacher workspace — original interface, fictional demonstration data. */
(function () {
'use strict';
const D=window.SchoolDesk, $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={book:'M4 4h5a4 4 0 0 1 3 2 4 4 0 0 1 3-2h5v15h-5a4 4 0 0 0-3 2 4 4 0 0 0-3-2H4z M12 6v15',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',check:'M20 6 9 17l-5-5',clipboard:'M9 5H5v16h14V5h-4 M9 3h6v4H9z M8 13l2 2 5-5',calendar:'M8 2v4 M16 2v4 M3 10h18 M3 4h18v18H3z',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M9 2h6l1 4 4 1 2 5-3 3-1 5-6 2-3-3-5-1-2-6 3-3 1-5z',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',plus:'M12 5v14 M5 12h14',arrow:'M5 12h14 M13 6l6 6-6 6',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',upload:'M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5',close:'M6 6l12 12 M6 18 18 6',clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',edit:'m16 3 5 5-12 12-6 1 1-6z M14 5l5 5',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',leaf:'M20 3C8 2 2 7 5 15s17 10 15-12 M4 21l12-12',menu:'M3 6h18 M3 12h18 M3 18h18',print:'M6 9V3h12v6 M6 18H3V9h18v9h-3 M6 14h12v8H6z',info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',save:'M19 21H5l-2-2V3h15l3 3v13z M7 3v6h10V3 M7 21v-8h10v8',file:'M14 2H4v20h16V8z M14 2v6h6 M8 13h8 M8 17h5'};
const icon=name=>`<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name]||paths.book}"/></svg>`;
let storage;try{storage=window.localStorage;}catch{storage=null;}
const store=new D.Store(storage);
if(!storage)store.warning='Browser storage is unavailable. Changes are temporary; export a backup before closing.';
const today=D.isoDate(), nav=[['overview','Overview','grid'],['students','Students','users'],['classes','My classes','book'],['attendance','Attendance','clipboard'],['planner','Lesson planner','file'],['assessments','Marksbook','check'],['timetable','Timetable','calendar'],['pastoral','Pastoral care','heart'],['notices','Noticeboard','bell'],['settings','Settings','settings']];
const ui={page:'overview',studentSearch:'',year:'',studentStatus:'Active',pastoralFilter:'Open',pastoralSearch:'',noticeFilter:'',planClass:'',rollClass:'c1',rollDate:today,rollDirty:false,markDirty:false,week:D.weekStart(today)};
Object.assign(ui,{rollTerm:D.termAt(store.data,today)?.id||store.data.calendar.terms[0]?.id||'',rollPeriod:'p1',rollDraft:{},markClass:store.data.classes[0]?.id||'',markYear:D.yearAt(store.data,today)?.id||store.data.calendar.years[0]?.id||'',markDraft:{},planDate:today,planMode:'week'});
let toastTimer,dialogReturn=null;
const state=()=>store.data;
const fullName=s=>s?`${s.firstName} ${s.lastName}`:'Unknown student';
const initials=name=>name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const byStudent=id=>state().students.find(s=>s.id===id);
const byClass=id=>state().classes.find(c=>c.id===id);
const roster=c=>(c?.studentIds||[]).map(byStudent).filter(s=>s?.active).sort((a,b)=>a.lastName.localeCompare(b.lastName));
const fmt=(d,options={day:'numeric',month:'short',year:'numeric'})=>new Date(d+'T12:00:00').toLocaleDateString('en-AU',options);
const opt=(value,label,selected)=>`<option value="${esc(value)}"${String(value)===String(selected)?' selected':''}>${esc(label)}</option>`;
const classOptions=selected=>state().classes.map(c=>opt(c.id,c.code+' · '+c.name,selected)).join('');
const badge=(text,colour='')=>`<span class="badge ${colour}">${esc(text)}</span>`;
const button=(label,action,args='',style='',ico='')=>`<button type="button" class="button ${style}" data-action="${action}"${args?` data-id="${esc(args)}"`:''}>${ico?icon(ico):''}${esc(label)}</button>`;
const empty=(title,body,action='')=>`<div class="empty">${icon('leaf')}<h3>${esc(title)}</h3><p>${esc(body)}</p>${action}</div>`;
const person=s=>`<button type="button" class="name-link person" data-action="student-view" data-id="${esc(s.id)}"><span class="avatar ${['','peach','lavender','blue'][state().students.indexOf(s)%4]}">${esc(initials(fullName(s)))}</span><span><strong>${esc(fullName(s))}</strong><small>${esc(s.code)}</small></span></button>`;
const heading=(eyebrow,title,description,actions='')=>`<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
function toast(message,error=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').className='toast visible'+(error?' error':'');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function warning(){const el=$('storage-warning');el.hidden=!store.warning;el.textContent=store.warning;}
function sidebar(){
  const s=state().settings;
  $('sidebar').innerHTML=`<div class="brand"><img src="assets/icon.svg" alt="">SchoolDesk</div><div class="school-name">${esc(s.school)}</div><div class="nav-label">Teaching workspace</div><nav>${nav.slice(0,9).map(([id,title,ico])=>`<a class="nav-item ${ui.page===id?'active':''}" href="#${id}" data-page="${id}"${ui.page===id?' aria-current="page"':''}>${icon(ico)}${title}</a>`).join('')}</nav><div class="nav-spacer"></div><div class="sidebar-note"><strong>A place for every learner.</strong>Teaching, learning and student care, connected.</div><a class="nav-item ${ui.page==='settings'?'active':''}" href="#settings" data-page="settings">${icon('settings')}Settings & data</a><div class="sidebar-user"><span class="avatar teacher-avatar">${esc(initials(s.teacher))}</span><div><strong>${esc(s.teacher)}</strong><small>${esc(s.role)} · Demo workspace</small></div></div>`;
  $('profile-button').textContent=initials(s.teacher);
}
function dirty(){return ui.rollDirty||ui.markDirty;}
function discard(){if(dirty()&&!window.confirm('You have unsaved changes. Leave without saving?'))return false;ui.rollDirty=false;ui.markDirty=false;ui.rollDraft={};ui.markDraft={};return true;}
function go(page,args={}){if(!discard())return false;Object.assign(ui,args);ui.page=nav.some(n=>n[0]===page)?page:'overview';history.replaceState(null,'','#'+ui.page);$('sidebar').classList.remove('open');$('menu-button').setAttribute('aria-expanded','false');render();$('main').focus();return true;}
function render(preserve=false){
  const focused=preserve?document.activeElement:null,focusId=focused?.id,start=focused?.selectionStart,end=focused?.selectionEnd;
  ensureV2Selection();sidebar();warning();$('breadcrumb').textContent=nav.find(n=>n[0]===ui.page)[1];
  const pages={overview:overview,students:studentsPage,classes:classesPage,attendance:attendancePage,planner:plannerPage,assessments:assessmentsPage,timetable:timetablePage,pastoral:pastoralPage,notices:noticesPage,settings:settingsPage};
  const oldScroll=['.attendance-scroll','.marks-scroll'].map(selector=>[selector,document.querySelector(selector)?.scrollLeft||0]);
  $('main').innerHTML=pages[ui.page]();
  for(const[selector,left]of oldScroll){const el=document.querySelector(selector);if(el)el.scrollLeft=left;}
  if(ui.attendanceFocus&&ui.page==='attendance'){$('lesson-'+ui.attendanceFocus)?.scrollIntoView?.({block:'nearest',inline:'center'});ui.attendanceFocus='';}
  if(focusId&&$(focusId)){const el=$(focusId);el.focus();try{if(start!==null)el.setSelectionRange(start,end);}catch{}}
}
function commit(change,message){store.commit(change);warning();if(message)toast(message);}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openDialog(title,content,wide=false){
  if(!$('dialog').open)dialogReturn=document.activeElement;
  const d=$('dialog');d.className='dialog'+(wide?' wide':'');d.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${content}</div>`;
  if(!d.open)d.showModal();
}
function closeDialog(){$('dialog').close();dialogReturn?.isConnected&&dialogReturn.focus();}
const field=(label,name,value='',type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area=(label,name,value='',extra='')=>`<label class="field ${extra}">${label}<textarea name="${name}" maxlength="10000">${esc(value)}</textarea></label>`;
const selectField=(label,name,options,extra='')=>`<label class="field ${extra}">${label}<select name="${name}">${options}</select></label>`;
const form=(kind,id,content,submit='Save changes')=>`<form data-form="${kind}" data-id="${esc(id||'')}"><div class="form-error" role="alert"></div>${content}<div class="dialog-actions">${button('Cancel','close-dialog')}<button type="submit" class="button primary">${icon('save')}${submit}</button></div></form>`;
function overview(){
  const s=state(),a=D.attendanceSummary(s),upcoming=[...s.assessments].sort((a,b)=>a.due.localeCompare(b.due)).filter(a=>a.due>=today),open=s.notes.filter(n=>n.status==='Open'),day=D.nextTeachingDay(s,today),lessons=D.sessionsOn(s,day),active=s.students.filter(s=>s.active).length;
  const first=s.settings.teacher.split(' ')[0], greeting=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening';
  const stats=[['Your students',active,'Across '+s.classes.length+' teaching groups','users'],['Recorded attendance',a.rate===null?'—':a.rate+'%',a.total+' student marks · all saved rolls','clipboard'],['Upcoming assessments',upcoming.length,'Tasks due from today onwards','file'],['Student follow-ups',open.length,'Open pastoral care records','heart']];
  const complete=s.assessments.reduce((n,a)=>n+Object.keys(a.marks).filter(id=>byStudent(id)?.active&&byClass(a.classId)?.studentIds.includes(id)).length,0),total=s.assessments.reduce((n,a)=>n+roster(byClass(a.classId)).length,0);
  return heading('Your teaching day',`${greeting}, ${first}.`,'A little clarity for your school day.',`<span class="date-chip">${icon('calendar')}${esc(fmt(today,{weekday:'short',day:'numeric',month:'long'}))}</span>${button('Take attendance','nav-attendance','','primary','plus')}`)+
    `<div class="stats-grid">${stats.map(([label,num,foot,ico])=>`<div class="stat-card"><div class="stat-top">${label}${icon(ico)}</div><div class="stat-number">${num}</div><div class="stat-foot">${esc(foot)}</div></div>`).join('')}</div><div class="dashboard-grid"><div><div class="welcome-strip">${icon('leaf')}<div><h3>Small steps. Meaningful progress.</h3><p>Everything you need to keep your learners moving forward.</p></div>${button('Plan a lesson','new-plan','','small')}</div>
    <section class="panel"><div class="panel-head"><div><h2>${day===today?"Today's classes":"Your next teaching day"}</h2><p>${esc(fmt(day,{weekday:'long',day:'numeric',month:'long'}))} · ${lessons.length} scheduled sessions</p></div>${button('View timetable','nav-timetable','','text small','arrow')}</div><div class="panel-body">${lessons.length?lessons.map(l=>{const c=byClass(l.classId)||{colour:'peach',name:l.title||'School event',code:'Event',room:l.room,studentIds:[]};return `<div class="schedule-row"><div class="schedule-time">${l.start}<small>${l.end}</small></div><div class="course-detail ${c.colour}"><h3>${esc(c.name)}</h3><p>${esc(c.code)} <span>·</span> ${esc(l.room||c.room)} <span>·</span> ${roster(c).length} students</p></div>${button('Open session','session-open',l.key,'small','arrow')}</div>`;}).join(''):empty('No classes scheduled','Add your recurring lessons to the timetable.')}</div></section>
    <section class="panel"><div class="panel-head"><div><h2>Coming up in your classes</h2><p>Assessment deadlines at a glance</p></div>${button('All assessments','nav-assessments','','text small','arrow')}</div><div class="panel-body">${upcoming.length?upcoming.slice(0,4).map(a=>`<div class="assessment-row"><div class="date-tile">${new Date(a.due+'T12:00:00').getDate()}<small>${esc(fmt(a.due,{month:'short'}))}</small></div><div><h3><button class="link-text" data-action="open-marks" data-id="${esc(a.id)}">${esc(a.title)}</button></h3><p>${esc(byClass(a.classId).code)} · Out of ${a.max}</p></div>${badge(Object.keys(a.marks).length+' marked',byClass(a.classId).colour)}</div>`).join(''):empty('Nothing due soon','New assessment tasks will appear here.')}</div></section></div>
    <div class="dashboard-side"><section class="panel"><div class="panel-head"><h2>Staff noticeboard</h2>${button('View all','nav-notices','','text small','arrow')}</div><div class="panel-body">${s.notices.length?[...s.notices].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2).map(n=>`<article class="notice"><div class="notice-meta">${badge(n.category,n.category==='Staff notice'?'peach':'')}<span>${esc(fmt(n.date,{day:'numeric',month:'short'}))}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join(''):empty('A quiet noticeboard','Create a staff notice to get started.')}</div></section>
    <section class="panel"><div class="panel-head"><h2>Quick access</h2><span class="section-kicker">Your tools</span></div><div class="panel-body"><div class="quick-links">${[['students','Student directory','users'],['planner','Lesson planner','file'],['pastoral','Pastoral care','heart'],['assessments','Marksbook','check']].map(([p,t,i])=>`<button class="quick-link" data-page="${p}">${icon(i)}${t}</button>`).join('')}</div></div></section>
    <section class="panel"><div class="panel-head"><h2>A little follow-up</h2>${badge(open.length+' open','peach')}</div><div class="panel-body">${open.slice(0,2).map(n=>`<div class="care-row"><span class="avatar lavender">${esc(initials(fullName(byStudent(n.studentId))))}</span><div><h3>${esc(fullName(byStudent(n.studentId)))}</h3><p>${esc(n.category)}</p></div><button class="icon-button" data-action="student-view" data-id="${esc(n.studentId)}" aria-label="Open ${esc(fullName(byStudent(n.studentId)))}">${icon('arrow')}</button></div>`).join('')||'<p class="subtle">You’re up to date with student follow-ups.</p>'}<hr><div class="muted-heading">Assessment marking</div><div class="roll-meta"><span>${complete} of ${total} results entered</span></div><div class="progress-track"><i style="width:${total?complete/total*100:0}%"></i></div><small class="subtle">Across your current class rosters</small></div></section></div></div>`;
}
function filteredStudents(){return state().students.filter(s=>(ui.studentStatus==='All'||s.active===(ui.studentStatus==='Active'))&&(!ui.year||s.year===ui.year)&&`${fullName(s)} ${s.code} ${s.homegroup}`.toLowerCase().includes(ui.studentSearch.toLowerCase()));}
function studentsPage(){
 const list=filteredStudents().sort((a,b)=>a.lastName.localeCompare(b.lastName));
 return heading('People & progress','Student directory','Know your learners. Keep the important details close.',button('Export CSV','export-students','','','download')+button('Add student','new-student','','primary','plus'))+`<div class="toolbar"><input class="search-input" id="student-search" aria-label="Search students" placeholder="Search name, number or home group…" value="${esc(ui.studentSearch)}"><select id="student-year" aria-label="Filter by year">${opt('','All year levels',ui.year)}${[...new Set(state().students.map(s=>s.year))].sort().map(y=>opt(y,'Year '+y,ui.year)).join('')}</select><select id="student-status" aria-label="Filter student status">${['Active','Archived','All'].map(s=>opt(s,s,ui.studentStatus)).join('')}</select><span class="right subtle">${list.length} students</span></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Student</th><th scope="col">Year level</th><th scope="col">Home group</th><th scope="col">Classes</th><th scope="col">Status</th><th scope="col">Profile</th></tr></thead><tbody>${list.map(s=>`<tr><td>${person(s)}</td><td>Year ${esc(s.year)}</td><td>${esc(s.homegroup)||'—'}</td><td>${state().classes.filter(c=>c.studentIds.includes(s.id)).length}</td><td>${badge(s.active?'Active':'Archived',s.active?'':'grey')}</td><td>${button('View profile','student-view',s.id,'small','arrow')}</td></tr>`).join('')}</tbody></table>${!list.length?empty('No matching students','Try another search or add a student.'):''}</div><div class="table-caption"><span>${list.length} matching students · ${state().students.length} total records</span><span>Fictional demo data</span></div></section>`;
}
function studentView(id){
 const s=byStudent(id);if(!s)return;
 const a=D.attendanceSummary(state(),id),classes=state().classes.filter(c=>c.studentIds.includes(id)),notes=state().notes.filter(n=>n.studentId===id).sort((a,b)=>b.date.localeCompare(a.date)),assessments=state().assessments.filter(a=>Object.hasOwn(a.marks,id));
 openDialog('Student profile',`<div class="profile-hero"><span class="avatar ${s.active?'':'peach'}">${esc(initials(fullName(s)))}</span><div><h3>${esc(fullName(s))}</h3><p>${esc(s.code)} · Year ${esc(s.year)} · ${esc(s.homegroup)}</p></div></div><dl class="profile-grid"><div><dt>Parent / caregiver</dt><dd>${esc(s.guardian)||'Not recorded'}</dd></div><div><dt>Contact email</dt><dd>${esc(s.email)||'Not recorded'}</dd></div><div><dt>Phone</dt><dd>${esc(s.phone)||'Not recorded'}</dd></div><div><dt>Attendance (all recorded rolls)</dt><dd>${a.rate===null?'Not yet recorded':a.rate+'% · '+a.total+' marks (Present + Late)'}</dd></div></dl><div class="profile-section"><h3>Class memberships</h3>${classes.map(c=>badge(c.code,c.colour)).join('')||'<p>No class memberships yet.</p>'}</div><div class="profile-section"><h3>Learning support</h3><p>${esc(s.support)||'No learning support notes recorded.'}</p></div><div class="profile-section"><h3>Assessment results</h3>${assessments.map(a=>`<div class="mini-row"><span>${esc(a.title)}</span><strong>${a.marks[id]} / ${a.max} · ${D.grade(a.marks[id],a.max)}</strong></div>`).join('')||'<p>No marks recorded yet.</p>'}</div><div class="profile-section"><h3>Pastoral care history</h3>${notes.map(n=>`<div class="notice"><div class="notice-meta">${badge(n.category,n.category==='Positive recognition'?'':'peach')}<span>${esc(fmt(n.date))} · ${esc(n.status)}</span></div><p>${esc(n.text)}</p></div>`).join('')||'<p>No pastoral care records yet.</p>'}</div>${studentAbsenceSection(id)}<div class="dialog-actions">${button('Add pastoral note','student-note',s.id,'','plus')}${button('Edit student','edit-student',s.id,'primary','edit')}</div>`,true);
}
function studentForm(id){
 const s=byStudent(id)||{firstName:'',lastName:'',code:'',year:'9',homegroup:'',guardian:'',email:'',phone:'',support:'',active:true};
 openDialog(id?'Edit student':'Add a student',form('student',id,`<div class="form-grid">${field('First name','firstName',s.firstName,'text','required maxlength="100"')}${field('Last name','lastName',s.lastName,'text','required maxlength="100"')}${field('Student number','code',s.code,'text','required maxlength="30"')}${selectField('Year level','year',Array.from({length:13},(_,i)=>String(i)).map(y=>opt(y,y==='0'?'Kindergarten / Pre-primary':'Year '+y,s.year)).join(''))}${field('Home group','homegroup',s.homegroup,'text','maxlength="100"')}${selectField('Record status','active',opt('true','Active',String(s.active))+opt('false','Archived',String(s.active)))}${field('Parent / caregiver','guardian',s.guardian,'text','maxlength="200"')}${field('Contact email','email',s.email,'email','maxlength="200"')}${field('Phone','phone',s.phone,'tel','maxlength="100"')}${area('Learning support notes','support',s.support,'full')}</div><p class="form-hint">Archiving keeps previous attendance, results and notes. Archived students are excluded from new rolls and current marksbooks.</p>`));
}
function classesPage(){return heading('Your teaching groups','My classes','One place for your rosters, learning and progress.',button('Create class','new-class','','primary','plus'))+`<div class="cards-grid">${state().classes.map(c=>`<article class="class-card"><div class="class-banner ${c.colour}"><div class="class-code">${esc(c.code)} · Year ${esc(c.year)}</div><h2>${esc(c.name)}</h2></div><div class="class-body"><div class="class-meta"><span>${roster(c).length} active students</span><span>Room ${esc(c.room)||'—'}</span></div><div class="class-actions">${button('Take roll','class-roll',c.id,'primary')}${button('Plan lesson','class-plan',c.id)}${button('Edit roster','edit-class',c.id,'','edit')}</div></div></article>`).join('')}</div>${!state().classes.length?empty('Build your first class','Add a class, then select the students in its roster.',button('Create class','new-class','','primary','plus')):''}`;}
function classForm(id){const c=byClass(id)||{name:'',code:'',year:'9',room:'',colour:'sage',studentIds:[]};openDialog(id?'Edit class & roster':'Create a class',form('class',id,`<div class="form-grid">${field('Class name','name',c.name,'text','required maxlength="100"')}${field('Class code','code',c.code,'text','required maxlength="30"')}${field('Year level','year',c.year,'number','required min="0" max="12" step="1"')}${field('Default room','room',c.room,'text','maxlength="100"')}${selectField('Colour','colour',['sage','peach','lavender','blue'].map(t=>opt(t,t[0].toUpperCase()+t.slice(1),c.colour)).join(''))}</div><h3>Student roster</h3><p class="form-hint">Select students in this teaching group. Existing results and rolls remain in the history if a student leaves a class.</p><div class="roster-list">${state().students.map(s=>`<label><input type="checkbox" name="studentIds" value="${esc(s.id)}"${c.studentIds.includes(s.id)?' checked':''}><span>${esc(fullName(s))} <small class="subtle">· ${esc(s.year)}${s.active?'':' · Archived'}</small></span></label>`).join('')||'<p class="subtle">Add students in the directory first.</p>'}</div>`));}
function pastoralPage(){const list=[...state().notes].filter(n=>(ui.pastoralFilter==='All'||n.status===ui.pastoralFilter)&&`${fullName(byStudent(n.studentId))} ${n.text} ${n.category}`.toLowerCase().includes(ui.pastoralSearch.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));return heading('Every learner matters','Pastoral care','Recognise the positives. Record concerns. Close the loop.',button('Add a record','new-note','','primary','plus'))+`<div class="toolbar"><input id="pastoral-search" class="search-input" aria-label="Search pastoral care records" placeholder="Search students, notes or categories…" value="${esc(ui.pastoralSearch)}"><select id="pastoral-status" aria-label="Filter pastoral status">${['Open','Closed','All'].map(s=>opt(s,s==='All'?'All records':s+' records',ui.pastoralFilter)).join('')}</select><span class="right subtle">${list.length} records</span></div>${list.map(n=>`<article class="note-card"><div class="note-top">${person(byStudent(n.studentId))}<div class="note-top-right">${badge(n.category,n.category==='Positive recognition'?'':'peach')}${badge(n.status,n.status==='Open'?'blue':'grey')}</div></div><p>${esc(n.text)}</p><div class="note-bottom"><span>${esc(fmt(n.date))} · Recorded by ${esc(n.author)}</span><div class="inline-actions">${button('Edit','edit-note',n.id,'small','edit')}${button(n.status==='Open'?'Close follow-up':'Reopen','toggle-note',n.id,'small',n.status==='Open'?'check':'arrow')}</div></div></article>`).join('')||empty('No records here','Try a different filter or add a pastoral care record.')}`;}
function noteForm(id,studentId=''){const n=state().notes.find(n=>n.id===id)||{studentId:studentId||state().students.find(s=>s.active)?.id,category:'Wellbeing',text:'',date:today,status:'Open'};if(!state().students.length){toast('Add a student before creating pastoral records.',true);return;}openDialog(id?'Edit pastoral record':'Add a pastoral record',form('note',id,`<div class="form-grid">${selectField('Student','studentId',state().students.map(s=>opt(s.id,fullName(s)+(s.active?'':' (archived)'),n.studentId)).join(''))}${selectField('Category','category',D.CATEGORIES.map(c=>opt(c,c,n.category)).join(''))}${field('Date','date',n.date,'date','required')}${selectField('Follow-up status','status',['Open','Closed'].map(s=>opt(s,s,n.status)).join(''))}<label class="field full">Record details<textarea name="text" required maxlength="10000">${esc(n.text)}</textarea></label></div><p class="form-hint">Keep notes clear, factual and relevant. These demonstration records are stored only in this browser.</p>`));}
function noticesPage(){const list=[...state().notices].filter(n=>!ui.noticeFilter||n.category===ui.noticeFilter).sort((a,b)=>b.date.localeCompare(a.date));return heading('In the loop','Staff noticeboard','A shared-looking noticeboard for your local workspace.',button('Write a notice','new-notice','','primary','plus'))+`<div class="toolbar"><select id="notice-category" aria-label="Filter notices by category">${opt('','All categories',ui.noticeFilter)}${['Staff notice','Teaching & learning','School event'].map(c=>opt(c,c,ui.noticeFilter)).join('')}</select><span class="subtle">Local notices · visible in this browser only</span></div><div class="plan-list">${list.map(n=>`<article class="note-card"><div class="note-top">${badge(n.category,n.category==='School event'?'lavender':'peach')}<small class="subtle">${esc(fmt(n.date))}</small></div><h2 style="margin-top:18px;font-size:18px">${esc(n.title)}</h2><p>${esc(n.body)}</p><div class="note-tools inline-actions">${button('Edit notice','edit-notice',n.id,'small','edit')}${button('Delete','delete-notice',n.id,'small danger','trash')}</div></article>`).join('')}</div>${!list.length?empty('Nothing posted yet','Create your first notice for the workspace.'):''}`;}
function noticeForm(id){const n=state().notices.find(n=>n.id===id)||{title:'',category:'Staff notice',date:today,body:''};openDialog(id?'Edit notice':'Write a notice',form('notice',id,`<div class="form-grid">${field('Title','title',n.title,'text','required maxlength="200"')}${field('Display date','date',n.date,'date','required')}${selectField('Category','category',['Staff notice','Teaching & learning','School event'].map(c=>opt(c,c,n.category)).join(''))}${area('Notice text','body',n.body,'full')}</div>`));}
function searchResults(query){const list=state().students.filter(s=>`${fullName(s)} ${s.code}`.toLowerCase().includes(query.toLowerCase())).slice(0,12);return list.map(s=>`<button data-action="student-view" data-id="${esc(s.id)}"><span class="avatar">${esc(initials(fullName(s)))}</span><span><strong>${esc(fullName(s))}</strong><small>${esc(s.code)} · Year ${esc(s.year)}${s.active?'':' · Archived'}</small></span>${icon('arrow')}</button>`).join('')||'<div class="empty">No matching students.</div>';}
function openSearch(){openDialog('Find a student',`<label class="field">Search by name or student number<input id="global-search" placeholder="Start typing…" autocomplete="off" autofocus></label><div class="search-results" id="global-results">${searchResults('')}</div><p class="form-hint">Showing up to 12 matching students. Use the directory for all records.</p>`);}
function exportStudents(){const rows=[['Student number','First name','Last name','Year','Home group','Parent / caregiver','Email','Phone','Status'],...filteredStudents().map(s=>[s.code,s.firstName,s.lastName,s.year,s.homegroup,s.guardian,s.email,s.phone,s.active?'Active':'Archived'])];download('schooldesk-students-'+today+'.csv',D.csv(rows),'text/csv;charset=utf-8');toast('Matching student records exported.');}
function backup(){if(dirty()){toast('Backup includes saved records only. Save your current edits first.',true);return;}download('schooldesk-backup-'+today+'.json',JSON.stringify(state(),null,2),'application/json');toast('Workspace backup downloaded.');}
function deleteRecord(list,id,label){if(!window.confirm(`Delete this ${label}? This cannot be undone.`))return;commit(s=>{s[list]=s[list].filter(x=>x.id!==id);},`${label[0].toUpperCase()+label.slice(1)} deleted.`);closeDialog();if(list==='assessments'){ui.markDraft={};ui.markDirty=false;}render();}
function ensureV2Selection() {
  const s=state();
  if(!byClass(ui.rollClass))ui.rollClass=s.classes[0]?.id||'';
  if(!byClass(ui.markClass))ui.markClass=s.classes[0]?.id||'';
  if(!s.calendar.years.some(y=>y.id===ui.markYear))ui.markYear=D.yearAt(s,today)?.id||s.calendar.years[0]?.id||'';
  if(!s.calendar.terms.some(t=>t.id===ui.rollTerm))ui.rollTerm=D.termAt(s,ui.rollDate)?.id||s.calendar.terms[0]?.id||'';
  ui.rollDraft??={};ui.markDraft??={};
  document.documentElement?.setAttribute('data-theme',s.settings.theme);
}
const yearOptions=selected=>state().calendar.years.map(y=>opt(y.id,y.name,selected)).join('');
const termOptions=selected=>[...state().calendar.terms].sort((a,b)=>a.start.localeCompare(b.start)).map(t=>opt(t.id,state().calendar.years.find(y=>y.id===t.yearId).name+' · '+t.name,selected)).join('');
const teachingPeriods=()=>state().periods.filter(p=>!p.isBreak);
const pct=n=>n===null||n===undefined?'—':Number(n.toFixed(2))+'%';
function statusIcon(status) {
  if(!status)return '<span class="unmarked-dot" aria-hidden="true"></span>';
  const tick='<path d="m2 8 4 4L14 3" fill="none" stroke="#183d50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="m2 8 4 4L14 3" fill="none" stroke="#36a7d9" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';
  const cross='<path d="m4 4 8 8m0-8-8 8" stroke="#61221f" stroke-width="4.5"/><path d="m4 4 8 8m0-8-8 8" stroke="#e02c25" stroke-width="3"/>';
  let drawing=status==='Absent'?cross:tick;
  if(status==='Late')drawing+='<path d="M11 8v7h4" fill="none" stroke="#59852c" stroke-width="2.7"/>';
  else if(['Alternate programme','Camp','Excursion'].includes(status))drawing+=status==='Alternate programme'?'<path d="m11 8 1.4 2.5 2.8.2-2 2 .6 2.8-2.8-1.2-2.4 1.4.3-3-2.1-1.8 2.8-.4z" fill="#ee9b44" stroke="#8d552e" stroke-width=".6"/>':'<path d="m11 9 4 6H7z" fill="#efb169" stroke="#8d552e" stroke-width=".7"/>';
  else if(status==='Late/Medical')drawing='<path d="M2 2h9v9H2z" fill="#f9f9f9" stroke="#444"/><path d="m3 4 3 4 3-5" fill="none" stroke="#888"/><path d="M10 8v7h5" fill="none" stroke="#bf3028" stroke-width="2.7"/>';
  else if(status==='Medical')drawing='<path d="M3 2h9v10H3z" fill="#fff" stroke="#555"/><path d="M8 7h7v3H8zM10 5h3v7h-3z" fill="#d62e2a" stroke="#842c27" stroke-width=".5"/>';
  else if(status==='Music lesson')drawing+='<path d="M13 6v8c-4 3-7 0-3-2l1-.2V7z" fill="#76a83e" stroke="#416b2b" stroke-width=".6"/>';
  else if(status==='Sick bay')drawing+='<path d="M10 8h3v7h-3zM8 10h7v3H8z" fill="#79b650" stroke="#456f36" stroke-width=".5"/>';
  else if(status.startsWith('Suspended'))drawing=(status==='Suspended (External)'?cross:tick)+'<path d="m12 7 3 4-3 4-3-4z" fill="#74ad3c" stroke="#345e2c" stroke-width=".8"/>';
  return `<svg class="attendance-symbol" viewBox="0 0 17 17" aria-hidden="true">${drawing}</svg>`;
}
function sessionFromKey(key) {const date=String(key).split('|')[0];return D.sessionsOn(state(),date).find(s=>s.key===key);}
function calendarDescription(date) {const info=D.dayInfo(state(),date);return info.label||(info.special?'Special Timetable · '+info.special.label:info.term?.name||'Teaching day');}
function timetablePage() {
  const dates=Array.from({length:5},(_,i)=>D.shiftDate(ui.week,i));
  return heading('A rhythm for your week','Your timetable','A period-by-period view, connected to your school calendar.',button('Print','print','','','print')+button('Add recurring class','new-lesson','','primary','plus'))+
    `<div class="toolbar"><div class="week-switch"><button class="icon-button" data-action="previous-week" aria-label="Previous week">${icon('left')}</button><span>${esc(fmt(ui.week,{day:'numeric',month:'short'}))} – ${esc(fmt(dates[4],{day:'numeric',month:'short'}))}</span><button class="icon-button" data-action="next-week" aria-label="Next week">${icon('right')}</button></div>${button('This week','this-week','','small')}${button('Special Timetable','new-special','','small','calendar')}<span class="right subtle">Click a class for Attendance, Marksbook or Lesson Plan</span></div>
    <div class="panel table-wrap"><table class="period-timetable"><thead><tr><th scope="col">Period</th>${dates.map(d=>`<th scope="col" class="${d===today?'current-day':''}">${esc(fmt(d,{weekday:'long'}))}<span>${esc(fmt(d,{day:'numeric',month:'short'}))}</span>${D.dayInfo(state(),d).special&&!D.dayInfo(state(),d).closed?badge('Special Timetable','peach'):''}</th>`).join('')}</tr></thead><tbody>${state().periods.map((p,i)=>`<tr class="${p.isBreak?'break-row':''}"><th scope="row">${esc(p.name)}<small>${p.start} – ${p.end}</small></th>${dates.map(date=>{
      const info=D.dayInfo(state(),date);
      if(info.closed)return i===0?`<td rowspan="9" class="closed-day"><div>${icon('calendar')}<strong>${esc(info.label)}</strong>${info.holiday?`<small>${esc(info.holiday.name)}</small>`:''}</div></td>`:'';
      const session=D.sessionsOn(state(),date).find(s=>s.periodId===p.id);
      if(p.isBreak)return `<td class="break-cell">${esc(p.name)}</td>`;
      if(!session)return '<td class="free-cell"><span>—</span></td>';
      const c=byClass(session.classId);
      return `<td><button class="lesson-block ${c?.colour||'peach'}" data-action="session-open" data-id="${esc(session.key)}"><small>${esc(c?.code||'School event')}</small><h3>${esc(session.title||c?.name||'Event')}</h3><p>${esc(session.room||c?.room||'')}</p></button></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div><p class="timeline-hint">Recess and lunch are fixed breaks. Calendar closures replace classes; Special Timetable replaces only its selected date. Edit period times and dates in Settings.</p>`;
}
function sessionMenu(key) {
  const l=sessionFromKey(key);if(!l)return toast('This session is no longer scheduled.',true);const c=byClass(l.classId);
  openDialog(l.title||c?.name||'School event',`<p class="form-hint">${esc(fmt(l.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))} · ${esc(l.periodName)} · ${l.start}–${l.end}<br>${esc(c?.code||'School event')} · ${esc(l.room)}${l.special?'<br>Special Timetable applies to this date only.':''}</p><div class="session-links">${c?button('Attendance','session-attendance',key,'primary','clipboard')+button('Marksbook','session-marks',key,'','check')+button('Lesson Plan','session-plan',key,'','file'):''}</div><div class="dialog-actions">${l.special?button('Edit this date','edit-special',state().specialDays.find(d=>d.date===l.date).id,'','edit'):button('Edit recurring class','edit-lesson',l.id,'','edit')}${button('Special Timetable for this date','special-date',l.date,'','calendar')}</div>`);
}
function lessonForm(id) {
  const l=state().lessons.find(l=>l.id===id)||{classId:state().classes[0]?.id,day:1,periodId:'p1',room:''};
  if(!state().classes.length)return toast('Create a class before adding timetable lessons.',true);
  openDialog(id?'Edit recurring class':'Add a recurring class',form('lesson',id,`<div class="form-grid">${selectField('Class','classId',classOptions(l.classId))}${selectField('Day of week','day',['Monday','Tuesday','Wednesday','Thursday','Friday'].map((d,i)=>opt(i+1,d,l.day)).join(''))}${selectField('Period','periodId',teachingPeriods().map(p=>opt(p.id,p.name+' · '+p.start+'–'+p.end,l.periodId)).join(''))}${field('Room','room',l.room,'text','maxlength="100"')}</div><p class="form-hint">This changes the recurring weekly timetable. Use Special Timetable to change one date only.</p>${id?button('Remove recurring class','delete-lesson',id,'danger small','trash'):''}`));
}
function currentAttendanceTerm() {return state().calendar.terms.find(t=>t.id===ui.rollTerm);}
function attendanceSessions() {const t=currentAttendanceTerm();return t?D.occurrences(state(),t.start,t.end,ui.rollClass):[];}
function attendanceStudents(sessions) {
  const ids=new Set(roster(byClass(ui.rollClass)).map(s=>s.id));
  for(const l of sessions){const saved=state().attendance.find(r=>r.id===l.key);Object.keys(saved?.rows||{}).forEach(id=>ids.add(id));}
  return [...ids].map(byStudent).filter(Boolean).sort((a,b)=>a.lastName.localeCompare(b.lastName));
}
function attendanceCell(session,student) {
  const value=D.attendanceValue(state(),session,student.id,ui.rollDraft),saved=state().attendance.find(r=>r.id===session.key)?.rows[student.id],c=byClass(session.classId);
  const editable=!value.locked&&(Boolean(saved)||(student.active&&c.studentIds.includes(student.id)));
  const title=value.status||(!editable?'Not on this class roster':'Unmarked');
  return `<td class="attendance-cell ${session.date===ui.rollDate?'selected-lesson':''}" data-session-cell="${esc(session.key)}"><button class="attendance-square ${value.locked?'locked':''}" data-action="attendance-cell" data-id="${esc(student.id)}" data-session="${esc(session.key)}" title="${esc(title)}" aria-label="${esc(fullName(student)+' · '+fmt(session.date)+' · '+session.periodName+' · '+title)}" aria-disabled="${!editable}"${editable?'':' data-locked="true"'}>${statusIcon(value.status)}</button></td>`;
}
function attendancePage() {
  const t=currentAttendanceTerm(),c=byClass(ui.rollClass),sessions=attendanceSessions(),students=attendanceStudents(sessions);
  return heading('Presence matters','Class attendance','A whole term of lessons, with the important details in each square.',button('Export saved attendance','export-attendance','','','download'))+
    `<div class="toolbar"><select id="roll-class" aria-label="Attendance class">${classOptions(ui.rollClass)}</select><select id="roll-term" aria-label="Attendance term">${termOptions(ui.rollTerm)}</select>${button('Mark selected lesson present','all-present','','soft','check')}<input type="date" id="roll-date" aria-label="Focus attendance date" value="${ui.rollDate}"><select id="roll-period" aria-label="Selected lesson for bulk marking">${sessions.filter(s=>s.date===ui.rollDate).map(s=>opt(s.periodId,s.periodName,ui.rollPeriod)).join('')||opt('','No lesson on this date','')}</select></div>`+
    (!c||!t?empty('Set up your classes and terms','Add school-year and term dates in Settings, then add a class.'):!sessions.length?empty('No lessons scheduled this term','Add recurring classes or a Special Timetable. Holidays do not create attendance columns.'):
    `<section class="panel"><div class="panel-head"><div><h2>${esc(c.name)} · ${esc(t.name)}</h2><p>${esc(fmt(t.start))} – ${esc(fmt(t.end))} · ${sessions.length} timetabled lessons</p></div>${badge(students.length+' students')}</div><div class="table-wrap attendance-scroll"><table class="attendance-grid"><thead><tr><th scope="col" class="student-fixed">Student</th>${sessions.map(l=>`<th scope="col" class="${l.date===ui.rollDate?'selected-lesson':''}" id="lesson-${esc(l.key)}"><button class="column-select" data-action="select-attendance-lesson" data-id="${esc(l.key)}" title="Select this lesson"><strong>${esc(fmt(l.date,{weekday:'short'}))}</strong><span>${esc(l.periodName)}</span><small>${esc(fmt(l.date,{day:'2-digit',month:'2-digit'}))}</small><small>W${D.termWeek(t,l.date)} · ${esc(t.name)}</small>${l.special?'<small>Special</small>':''}</button></th>`).join('')}</tr></thead><tbody>${students.map(s=>`<tr><th scope="row" class="student-fixed">${person(s)}${s.active?'':'<small class="subtle">Archived</small>'}</th>${sessions.map(l=>attendanceCell(l,s)).join('')}</tr>`).join('')}</tbody></table></div><div class="table-caption"><span>Click: Present → Absent → Present · Shift-click: Late · Alt-click: clear</span><span>Hover or focus an icon for its name</span></div></section><div class="savebar"><span id="attendance-save-label">${ui.rollDirty?'Unsaved attendance changes':'All attendance saved'}</span><button class="button" data-action="save-roll">${icon('save')}Save attendance</button></div>`)+
    `<p class="timeline-hint">Other attendance types are entered from the student profile and are read-only here. A selected lesson can be marked present in bulk; protected entries are skipped.</p><div class="attendance-legend">${['Present','Absent','Late',...D.ABSENCE_TYPES].map(type=>`<span>${statusIcon(type)}${esc(type)}</span>`).join('')}</div>`;
}
function writeAttendanceDraft(session,studentId,status) {
  if(D.attendanceValue(state(),session,studentId,ui.rollDraft).locked)throw new Error('Change this absence from the student screen.');
  if(!ui.rollDraft[session.key])ui.rollDraft[session.key]=D.clone(state().attendance.find(r=>r.id===session.key)?.rows||{});
  ui.rollDraft[session.key][studentId]={status,comment:ui.rollDraft[session.key][studentId]?.comment||''};ui.rollDirty=true;
}
function markCell(id,el,event) {
  if(el.dataset.locked==='true'){toast('This attendance type is read-only here. Open the student profile to change it.');return;}
  const session=sessionFromKey(el.dataset.session);if(!session)throw new Error('This lesson is no longer scheduled.');
  const value=D.attendanceValue(state(),session,id,ui.rollDraft),status=event.altKey?'':D.cycleAttendance(value.status,event.shiftKey);
  writeAttendanceDraft(session,id,status);el.innerHTML=statusIcon(status);el.title=status||'Unmarked';el.setAttribute('aria-label',fullName(byStudent(id))+' · '+fmt(session.date)+' · '+session.periodName+' · '+(status||'Unmarked'));$('attendance-save-label').textContent='Unsaved attendance changes';
}
function saveRoll() {
  if(!ui.rollDirty)return toast('Attendance is already saved.');
  commit(s=>{for(const[key,rows]of Object.entries(ui.rollDraft)){const date=key.split('|')[0],session=D.sessionsOn(s,date).find(l=>l.key===key);if(!session)throw new Error('The timetable changed. Reopen attendance before saving.');for(const[id,row]of Object.entries(rows)){const previous=s.attendance.find(r=>r.id===key)?.rows[id]?.status||'';if(row.status!==previous)D.setAttendance(s,session,id,row.status);}}},'Attendance saved.');
  ui.rollDraft={};ui.rollDirty=false;render();
}
function markSelectedPresent() {
  const list=attendanceSessions().filter(l=>l.date===ui.rollDate),session=list.find(l=>l.periodId===ui.rollPeriod)||list[0];
  if(!session)return toast('Select a date and period with a timetabled lesson first.',true);
  let count=0;for(const s of roster(byClass(ui.rollClass))){if(!D.attendanceValue(state(),session,s.id).locked){writeAttendanceDraft(session,s.id,'Present');count++;}}
  render();toast(count+' students marked present. Protected entries were kept.');
}
function studentAbsenceSection(id) {
  const rows=state().absences.filter(a=>a.studentId===id).sort((a,b)=>b.start.localeCompare(a.start));
  return `<div class="profile-section"><h3>Recorded attendance types</h3>${rows.map(a=>`<div class="mini-row"><span>${statusIcon(a.type)} ${esc(a.type)}<br>${esc(fmt(a.start))}${a.end!==a.start?' – '+esc(fmt(a.end)):''}</span><span>${a.periodIds.length?a.periodIds.map(id=>esc(D.periodAt(state(),id).name)).join(', '):'Full days'}</span></div>`).join('')||'<p>No other attendance types recorded.</p>'}<div style="margin-top:14px">${button('Manage student attendance','manage-absences',id,'small','calendar')}</div></div>`;
}
function manageAbsences(id) {
  ui.absenceStudent=id;const rows=state().absences.filter(a=>a.studentId===id).sort((a,b)=>b.start.localeCompare(a.start));
  openDialog('Attendance · '+fullName(byStudent(id)),`<p class="form-hint">These records override class attendance for the selected dates and periods. Teachers cannot change them in the class grid.</p>${rows.map(a=>`<div class="notice"><div class="note-top"><h3>${statusIcon(a.type)} ${esc(a.type)}</h3><span class="subtle">${esc(fmt(a.start))} – ${esc(fmt(a.end))}</span></div><p>${a.periodIds.length?a.periodIds.map(id=>esc(D.periodAt(state(),id).name)).join(', '):'All teaching periods'}${a.comment?'<br>'+esc(a.comment):''}</p><div class="inline-actions">${button('Edit','edit-absence',a.id,'small','edit')}${button('Remove','delete-absence',a.id,'small danger','trash')}</div></div>`).join('')||empty('No records yet','Add a date range and an attendance type.')}<div class="dialog-actions">${button('Add attendance type','new-absence',id,'primary','plus')}</div>`,true);
}
function absenceForm(id,studentId='') {
  const a=state().absences.find(a=>a.id===id)||{studentId,type:D.ABSENCE_TYPES[0],start:today,end:today,periodIds:[],comment:''};
  openDialog(id?'Edit student attendance':'Add student attendance',form('absence',id,`<input type="hidden" name="studentId" value="${esc(a.studentId)}"><p class="form-hint">${esc(fullName(byStudent(a.studentId)))}</p><div class="form-grid">${selectField('Attendance type','type',D.ABSENCE_TYPES.map(t=>opt(t,t,a.type)).join(''))}${field('Start date','start',a.start,'date','required')}${field('End date','end',a.end,'date','required')}</div><h3>Periods</h3><p class="form-hint">Leave all periods unchecked to cover full days, or choose specific periods throughout this date range.</p><div class="roster-list">${teachingPeriods().map(p=>`<label><input type="checkbox" name="periodIds" value="${p.id}"${a.periodIds.includes(p.id)?' checked':''}>${p.name}</label>`).join('')}</div>${area('Comment (optional)','comment',a.comment)}`));
}
function markTasks() {return D.yearAssessments(state(),ui.markClass,ui.markYear);}
function markValue(a,id) {return (ui.markDraft[a.id]||a.marks)[id];}
function marksOverall(id) {return D.overall(state(),id,ui.markClass,ui.markYear,ui.markDraft);}
function assessmentsPage() {
  const tasks=markTasks(),c=byClass(ui.markClass),y=state().calendar.years.find(y=>y.id===ui.markYear),students=roster(c);
  return heading('Evidence of learning','Yearly marksbook','Every assessment, side by side. Every learner’s progress in view.',button('Export marksbook','export-marks','','','download')+button('Create assessment','new-assessment','','primary','plus'))+
    `<div class="toolbar"><select id="marks-class" aria-label="Marksbook class">${classOptions(ui.markClass)}</select><select id="marks-year" aria-label="Marksbook school year">${yearOptions(ui.markYear)}</select><span class="right subtle">${tasks.length} assessments · ${students.length} students</span></div>`+
    (!c||!y?empty('Set up a class and school year','Manage school years in Settings.'):!tasks.length?empty('No assessments in this school year','Create the first task for this class and year.',button('Create assessment','new-assessment','','primary','plus')):
    `<section class="panel"><div class="panel-head"><h2>${esc(c.name)} · ${esc(y.name)}</h2>${badge('A 75 · B 65 · C 50 · D 35 · E 15 · F <15')}</div><div class="table-wrap marks-scroll"><table class="marksbook"><thead><tr><th rowspan="2" scope="col" class="student-fixed">Student</th>${tasks.map(a=>`<th colspan="2" scope="colgroup"><button class="assessment-heading" data-action="edit-assessment" data-id="${esc(a.id)}" title="${esc('Edit assessment: '+a.title)}">${esc(a.title)}</button><small>Due ${esc(fmt(a.due,{day:'numeric',month:'short'}))}</small></th>`).join('')}<th rowspan="2" scope="col" class="overall-col">Overall<br>Percentage</th><th rowspan="2" scope="col" class="overall-col">Overall<br>Grade</th></tr><tr>${tasks.map(a=>`<th scope="col">Score / ${a.max}</th><th scope="col" class="percentage-col">%</th>`).join('')}</tr></thead><tbody>${students.map(s=>`<tr><th scope="row" class="student-fixed">${person(s)}</th>${tasks.map(a=>{const m=markValue(a,s.id),has=m!==''&&m!==null&&m!==undefined,valid=has&&Number.isFinite(Number(m))&&Number(m)>=0&&Number(m)<=a.max;return `<td><input type="number" class="mark-input" id="mark-${esc(a.id)}-${esc(s.id)}" data-mark="${esc(s.id)}" data-assessment="${esc(a.id)}" min="0" max="${a.max}" step="any" placeholder="—" value="${has?esc(m):''}" aria-label="${esc(fullName(s)+' · '+a.title+' · score out of '+a.max)}" aria-invalid="${has&&!valid}"></td><td class="percentage-col" id="percent-${esc(a.id)}-${esc(s.id)}">${valid?pct(Number(m)/a.max*100):'—'}</td>`;}).join('')}<td class="overall-col" id="overall-percent-${esc(s.id)}">${pct(marksOverall(s.id).percent)}</td><td class="overall-col"><span class="grade" id="overall-grade-${esc(s.id)}">${marksOverall(s.id).grade}</span></td></tr>`).join('')}</tbody></table></div><div class="table-caption"><span>Blank = not assessed · 0 is a result</span><span>Final columns always show overall percentage and grade</span></div></section><div class="savebar"><span id="marks-save-label">${ui.markDirty?'Unsaved marks':'All marks saved'}</span><button class="button" data-action="save-marks">${icon('save')}Save marks</button></div>`)+
    `<p class="timeline-hint">Overall = total marks earned ÷ total available marks for tasks with a score. Blank tasks are excluded; a zero counts. Grades use the unrounded percentage.</p>`;
}
function updateMarkInput(el) {
  const a=state().assessments.find(a=>a.id===el.dataset.assessment),id=el.dataset.mark;
  if(!ui.markDraft[a.id])ui.markDraft[a.id]=D.clone(a.marks);
  ui.markDraft[a.id][id]=el.value;ui.markDirty=true;
  const n=Number(el.value),valid=el.value!==''&&Number.isFinite(n)&&n>=0&&n<=a.max;
  el.setAttribute('aria-invalid',String(el.value!==''&&!valid));$('percent-'+a.id+'-'+id).textContent=valid?pct(n/a.max*100):'—';
  const total=marksOverall(id);$('overall-percent-'+id).textContent=pct(total.percent);$('overall-grade-'+id).textContent=total.grade;$('marks-save-label').textContent='Unsaved marks';
}
function saveMarks() {
  for(const input of document.querySelectorAll('.mark-input'))if(input.validity.badInput)throw new Error('Enter a valid number or leave the score blank.');
  commit(s=>{for(const[id,draft]of Object.entries(ui.markDraft)){const a=s.assessments.find(a=>a.id===id);if(!a)throw new Error('An assessment changed. Reload the marksbook.');const marks={};for(const[studentId,raw]of Object.entries(draft)){if(raw===''||raw===undefined||raw===null)continue;const m=Number(raw);if(!Number.isFinite(m)||m<0||m>a.max)throw new Error(`Every mark for ${a.title} must be between 0 and ${a.max}.`);marks[studentId]=m;}a.marks=marks;}},'Marksbook saved.');
  ui.markDraft={};ui.markDirty=false;render();
}
function assessmentForm(id) {
  const a=state().assessments.find(a=>a.id===id)||{classId:ui.markClass||state().classes[0]?.id,yearId:ui.markYear,title:'',due:today,max:30,description:''};
  if(!state().classes.length||!state().calendar.years.length)return toast('Create a class and school year first.',true);
  if(!discard())return;render();
  openDialog(id?'Edit assessment':'Create an assessment',form('assessment',id,`<div class="form-grid">${id?`<div class="field">Class<p class="subtle">${esc(byClass(a.classId).code)}</p><input type="hidden" name="classId" value="${esc(a.classId)}"></div>`:selectField('Class','classId',classOptions(a.classId))}${selectField('School year','yearId',yearOptions(a.yearId))}${field('Assessment title','title',a.title,'text','required maxlength="200"')}${field('Due date','due',a.due,'date','required')}${field('Maximum marks','max',a.max,'number','min="0.01" max="100000" step="any" required')}${area('Instructions / description','description',a.description,'full')}</div><p class="form-hint">Existing results are kept. The maximum cannot be below a recorded score.</p>${id?button('Delete assessment','delete-assessment',id,'danger small','trash'):''}`));
}
function planFor(session) {return state().plans.find(p=>D.planKey(p.date,p.classId,p.periodId)===session.key);}
function planCard(l) {const c=byClass(l.classId),p=planFor(l);return `<article class="planner-session ${c.colour}"><div>${badge(l.periodName,c.colour)}<span class="subtle">${l.start}–${l.end}</span></div><h3>${esc(c.name)}</h3><p>${esc(p?.title||'Lesson plan not added yet')}</p>${p?.objective?`<p class="plan-intention">${esc(p.objective)}</p>`:''}${button(p?'Open lesson plan':'Plan this lesson','session-plan',l.key,p?'small':'primary small',p?'arrow':'plus')}</article>`;}
function plannerPage() {
  const start=ui.planMode==='day'?ui.planDate:D.weekStart(ui.planDate),end=ui.planMode==='day'?start:D.shiftDate(start,4),dates=ui.planMode==='day'?[start]:Array.from({length:5},(_,i)=>D.shiftDate(start,i)),sessions=D.occurrences(state(),start,end,ui.planClass);
  const keys=new Set(sessions.map(l=>l.key)),detached=state().plans.filter(p=>p.date>=start&&p.date<=end&&(!ui.planClass||p.classId===ui.planClass)&&!keys.has(D.planKey(p.date,p.classId,p.periodId)));
  return heading('Make room for learning','Lesson planner','A lesson plan for every timetabled class, by day or week.',button('Print','print','','','print')+button('New lesson plan','new-plan','','primary','plus'))+
    `<div class="toolbar"><div class="view-switch">${button('Daily','planner-day','','small '+(ui.planMode==='day'?'primary':''))}${button('Weekly','planner-week','','small '+(ui.planMode==='week'?'primary':''))}</div><button class="icon-button" data-action="planner-previous" aria-label="Previous ${ui.planMode==='day'?'day':'week'}">${icon('left')}</button><input id="planner-date" type="date" aria-label="Lesson planner date" value="${ui.planDate}"><button class="icon-button" data-action="planner-next" aria-label="Next ${ui.planMode==='day'?'day':'week'}">${icon('right')}</button>${button('Today','planner-today','','small')}<select id="plan-class" aria-label="Filter lesson plans by class">${opt('','All classes',ui.planClass)}${classOptions(ui.planClass)}</select></div>
    <div class="planner-scroll"><div class="planner-view ${ui.planMode==='day'?'daily':'weekly'}">${dates.map(date=>{const list=sessions.filter(l=>l.date===date),info=D.dayInfo(state(),date);return `<section class="planner-day"><h2>${esc(fmt(date,{weekday:'long',day:'numeric',month:'short'}))}</h2><small>${esc(calendarDescription(date))}</small>${list.map(planCard).join('')||empty(info.closed?info.label:'No classes',info.holiday?.name||'No lesson plans are required for this date.')}</section>`;}).join('')}</div></div>${detached.length?`<section class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>Saved plans outside the current timetable</h2><p>Retained when the calendar or timetable changes</p></div></div><div class="panel-body">${detached.map(p=>`<div class="mini-row"><span>${esc(fmt(p.date))} · ${esc(p.title)}</span>${button('View saved plan','view-plan',p.id,'small','arrow')}</div>`).join('')}</div></section>`:''}`;
}
function planPeriodOptions(classId,date,selected='',existing=null) {
  const list=D.sessionsOn(state(),date).filter(l=>l.classId===classId);
  const options=list.map(l=>opt(l.periodId,l.periodName+' · '+l.start+'–'+l.end,selected)).join('');
  if(existing&&existing.date===date&&existing.classId===classId&&!list.some(l=>l.periodId===existing.periodId))return opt(existing.periodId,'Saved session (no longer timetabled)',selected)+options;
  return options||opt('','No class session on this date','');
}
function planForm(id,key='',duplicate=false) {
  const existing=state().plans.find(p=>p.id===id),session=key?sessionFromKey(key):null;
  let p=existing||{classId:session?.classId||ui.planClass||state().classes[0]?.id,date:session?.date||ui.planDate,periodId:session?.periodId||'',title:'',objective:'',activities:'',resources:''};
  if(!p.classId)return toast('Create a class first.',true);
  if(duplicate)p={...p,date:ui.planDate,title:p.title+' (copy)'};
  if(!p.periodId)p={...p,periodId:D.sessionsOn(state(),p.date).find(l=>l.classId===p.classId)?.periodId||''};
  openDialog(duplicate?'Duplicate lesson plan':existing?'Edit lesson plan':'Plan a lesson',form('plan',duplicate?'':id,`<div class="form-grid"><label class="field">Class<select id="plan-form-class" name="classId">${classOptions(p.classId)}</select></label>${field('Lesson date','date',p.date,'date','required id="plan-form-date"')}<label class="field full">Timetabled session<select id="plan-form-period" name="periodId">${planPeriodOptions(p.classId,p.date,p.periodId,existing)}</select></label>${field('Lesson title','title',p.title,'text','required maxlength="200"')}${area('Learning intention','objective',p.objective,'full')}${area('Lesson sequence & activities','activities',p.activities,'full')}${area('Resources & preparation','resources',p.resources,'full')}</div><p class="form-hint">New plans link to a specific timetabled class and period. One saved plan is allowed per class session.</p>`),true);
}
function planView(id) {
  const p=state().plans.find(p=>p.id===id);if(!p)return;
  openDialog(p.title,`<p class="form-hint">${esc(byClass(p.classId).name)} · ${esc(fmt(p.date))} · ${esc(D.periodAt(state(),p.periodId)?.name||'Legacy plan')}</p>${[['Learning intention',p.objective],['Lesson sequence & activities',p.activities],['Resources & preparation',p.resources]].map(([t,v])=>`<div class="profile-section"><h3>${t}</h3><p>${esc(v)||'Not added yet.'}</p></div>`).join('')}<div class="dialog-actions">${button('Delete plan','delete-plan',p.id,'danger','trash')}${button('Duplicate','duplicate-plan',p.id,'','plus')}${button('Edit lesson','edit-plan',p.id,'primary','edit')}</div>`,true);
}
function settingsPage() {
  const s=state(),years=[...s.calendar.years].sort((a,b)=>a.start.localeCompare(b.start)),terms=[...s.calendar.terms].sort((a,b)=>a.start.localeCompare(b.start));
  const rowTools=(kind,id)=>`<span class="inline-actions">${button('Edit','edit-'+kind,id,'small','edit')}${button('Remove','delete-'+kind,id,'small danger','trash')}</span>`;
  return heading('Make it yours','Settings & school calendar','Your colours, teaching dates, periods and one-day timetable changes.')+
    `<div class="settings-grid"><div><section class="settings-card"><h2>Workspace & colours</h2><p>Choose a colour scheme and personalise the teaching workspace.</p><form data-form="settings"><div class="form-error" role="alert"></div>${field('School name','school',s.settings.school,'text','required maxlength="200"')}${field('Your display name','teacher',s.settings.teacher,'text','required maxlength="200"')}${field('Your role','role',s.settings.role,'text','required maxlength="200"')}${selectField('Colour scheme','theme',Object.entries(D.THEMES).map(([id,name])=>opt(id,name,s.settings.theme)).join(''))}<div class="theme-swatches" aria-hidden="true">${Object.keys(D.THEMES).map(t=>`<span class="swatch ${t}"></span>`).join('')}</div><button type="submit" class="button primary">${icon('save')}Save workspace</button></form></section>
    <section class="settings-card"><div class="section-heading"><h2>School years</h2>${button('Add year','new-year','','small','plus')}</div><p>These are editable demonstration dates. Set the school calendar before taking attendance.</p>${years.map(y=>`<div class="calendar-row"><div><strong>${esc(y.name)}</strong><small>${esc(fmt(y.start))} – ${esc(fmt(y.end))}</small></div>${rowTools('year',y.id)}</div>`).join('')||'<p>No school years configured.</p>'}</section>
    <section class="settings-card"><div class="section-heading"><h2>School terms</h2>${button('Add term','new-term','','small','plus')}</div><p>Term boundaries define the attendance grid and week numbers. Dates inside a school year but outside its terms are School Holidays.</p>${terms.map(t=>`<div class="calendar-row"><div><strong>${esc(s.calendar.years.find(y=>y.id===t.yearId).name)} · ${esc(t.name)}</strong><small>${esc(fmt(t.start))} – ${esc(fmt(t.end))}</small></div>${rowTools('term',t.id)}</div>`).join('')||'<p>No school terms configured.</p>'}</section></div>
    <div><section class="settings-card"><div class="section-heading"><h2>School & public holidays</h2>${button('Add holiday','new-holiday','','small','plus')}</div><p>Classes and lesson-plan entries are replaced with School Holidays or Public Holiday. Public holidays take priority when dates overlap.</p>${[...s.calendar.holidays].sort((a,b)=>a.start.localeCompare(b.start)).map(h=>`<div class="calendar-row"><div><strong>${esc(h.name)}</strong><small>${esc(h.type)} · ${esc(fmt(h.start))} – ${esc(fmt(h.end))}</small></div>${rowTools('holiday',h.id)}</div>`).join('')||'<p class="subtle">No additional holidays recorded. Gaps between terms already count as school holidays.</p>'}</section>
    <section class="settings-card"><div class="section-heading"><h2>Special Timetable</h2>${button('Add date','new-special','','small','plus')}</div><p>Replace the regular classes for one date. Other days and future recurring classes keep their usual timetable. Calendar closures still take priority.</p>${[...s.specialDays].sort((a,b)=>a.date.localeCompare(b.date)).map(d=>`<div class="calendar-row"><div><strong>${esc(d.label)}</strong><small>${esc(fmt(d.date))} · ${d.sessions.length} sessions</small></div>${rowTools('special',d.id)}</div>`).join('')||'<p>No special timetable dates recorded.</p>'}</section>
    <section class="settings-card"><h2>Timetable periods</h2><p>Set the start and end times for the nine periods. Recess and lunch remain breaks.</p><form data-form="periods"><div class="form-error" role="alert"></div><div class="period-editor">${s.periods.map(p=>`<div><strong>${esc(p.name)}</strong><label>Start<input name="start_${p.id}" aria-label="${p.name} start" type="time" required value="${p.start}"></label><label>End<input name="end_${p.id}" aria-label="${p.name} end" type="time" required value="${p.end}"></label></div>`).join('')}</div><button class="button primary" type="submit">${icon('save')}Save period times</button></form></section></div></div>
    <div class="settings-grid"><section class="settings-card"><h2>Backup & restore</h2><p>Saved data stays in this browser. Download a JSON backup before clearing storage. Version 1 backups are upgraded automatically when restored.</p>${button('Download backup','backup','','primary','download')}${button('Restore backup','restore','','','upload')}${store.blocked?'<hr>'+button('Export original saved data','export-original','','','download'):''}</section><section class="settings-card"><h2>About version 2.0</h2><p>This is a single-user prototype with fictional records, no staff login and no shared database. SchoolDesk is independent of SEQTA and Tes.</p><p>Overall grades: A ≥75%, B ≥65%, C ≥50%, D ≥35%, E ≥15%, F below 15%. Blank tasks are excluded from overall marks.</p>${button('Reset demo data','reset','','danger','trash')}</section></div>`;
}
function calendarForm(kind,id) {
  const list=kind==='year'?'years':kind==='term'?'terms':'holidays',old=state().calendar[list].find(x=>x.id===id),y=state().calendar.years[0];
  if(kind==='term'&&!y)return toast('Add a school year first.',true);
  const x=old||{name:kind==='year'?String(Number(today.slice(0,4))+1):kind==='term'?'Term 1':'',start:kind==='term'?y.start:today,end:kind==='term'?y.end:today,yearId:y?.id,type:'School Holidays'};
  openDialog((id?'Edit ':'Add ')+(kind==='year'?'school year':kind==='term'?'school term':'holiday'),form(kind,id,`<div class="form-grid">${field('Name','name',x.name,'text','required maxlength="200"')}${kind==='term'?selectField('School year','yearId',yearOptions(x.yearId)):''}${kind==='holiday'?selectField('Type','type',['School Holidays','Public Holiday'].map(t=>opt(t,t,x.type)).join('')):''}${field('Start date','start',x.start,'date','required')}${field('End date','end',x.end,'date','required')}</div><p class="form-hint">Start and end dates are inclusive. School years and terms cannot overlap.</p>`));
}
function specialForm(id,date=today,copyRegular=false) {
  const old=state().specialDays.find(d=>d.id===id)||state().specialDays.find(d=>d.date===date),selected=old?.date||date;
  const sessions=copyRegular?state().lessons.filter(l=>l.day===new Date(selected+'T12:00:00').getDay()):old?.sessions||[];
  openDialog('Special Timetable',form('special',old?.id||'',`<div class="form-grid">${field('Date','date',selected,'date','required id="special-form-date"')}${field('Name / event','label',old?.label||'Special Timetable','text','required maxlength="200"')}</div><p class="form-hint">This replaces all recurring sessions for the selected date only. Leave a period empty for no class. School event entries can have a title without a class roster.</p>${button('Copy regular timetable','copy-regular-special','','small','calendar')}<div class="special-editor">${teachingPeriods().map(p=>{const l=sessions.find(l=>l.periodId===p.id),value=l?.classId||(l?'__event':'');return `<div><h3>${p.name}<small>${p.start}–${p.end}</small></h3><label class="field">Class or event<select name="class_${p.id}">${opt('','No class',value)}${opt('__event','School event (no class roster)',value)}${classOptions(value)}</select></label>${field('Title (required for an event)','title_'+p.id,l?.title||'','text','maxlength="200"')}${field('Room','room_'+p.id,l?.room||'','text','maxlength="100"')}</div>`;}).join('')}</div>`),true);
}
function saveV2Form(kind,fd,id) {
  const read=name=>String(fd.get(name)||'').trim();
  if(['year','term','holiday'].includes(kind)){
    const key=kind==='year'?'years':kind==='term'?'terms':'holidays',x={id:id||D.uid(kind),name:read('name'),start:read('start'),end:read('end')};
    if(kind==='term')x.yearId=read('yearId');if(kind==='holiday')x.type=read('type');
    commit(s=>{const i=s.calendar[key].findIndex(x=>x.id===id);if(i<0)s.calendar[key].push(x);else s.calendar[key][i]=x;},'School calendar saved.');return true;
  }
  if(kind==='periods'){
    commit(s=>{s.periods=s.periods.map(p=>({...p,start:read('start_'+p.id),end:read('end_'+p.id)}));},'Timetable period times saved.');return true;
  }
  if(kind==='special'){
    const sessions=[];
    for(const p of teachingPeriods()){const value=read('class_'+p.id);if(!value)continue;sessions.push({id:'sp_'+p.id,periodId:p.id,classId:value==='__event'?'':value,title:read('title_'+p.id),room:read('room_'+p.id)});}
    const x={id:id||D.uid('special'),date:read('date'),label:read('label'),sessions};
    commit(s=>{const i=s.specialDays.findIndex(x=>x.id===id);if(i<0)s.specialDays.push(x);else s.specialDays[i]=x;},'Special Timetable saved for this date only.');return true;
  }
  if(kind==='absence'){
    const x={id:id||D.uid('absence'),studentId:read('studentId'),type:read('type'),start:read('start'),end:read('end'),periodIds:fd.getAll('periodIds'),comment:read('comment')};
    commit(s=>{const i=s.absences.findIndex(a=>a.id===id);if(i<0)s.absences.push(x);else s.absences[i]=x;},'Student attendance saved.');ui.absenceStudent=x.studentId;return true;
  }
  return false;
}
function deleteCalendar(kind,id) {
  if(!window.confirm('Remove this '+kind+'? Saved attendance and lesson plans will be retained, even if no longer timetabled.'))return;
  commit(s=>{
    if(kind==='special')s.specialDays=s.specialDays.filter(x=>x.id!==id);
    else {const key=kind==='year'?'years':kind==='term'?'terms':'holidays';if(kind==='year'&&(s.calendar.terms.some(t=>t.yearId===id)||s.assessments.some(a=>a.yearId===id)))throw new Error('Remove this year’s terms and move or remove its assessments before removing the school year.');s.calendar[key]=s.calendar[key].filter(x=>x.id!==id);}
  },'Calendar updated.');render();
}
function exportAttendance() {
  const rows=[['Date','Class','Period / original session','Student number','Student','Attendance type','Comment']];
  const seen=new Set();
  for(const r of [...state().legacyAttendance,...state().attendance].sort((a,b)=>a.date.localeCompare(b.date)))for(const[id,row]of Object.entries(r.rows)){
    const value=r.periodId?D.attendanceValue(state(),{...r,key:r.id},id):row,s=byStudent(id);seen.add(r.id+'|'+id);rows.push([r.date,byClass(r.classId).code,D.periodAt(state(),r.periodId)?.name||r.session,s.code,fullName(s),value.status,value.comment]);
  }
  for(const a of state().absences)for(const l of D.occurrences(state(),a.start,a.end)){const c=byClass(l.classId);if(!c.studentIds.includes(a.studentId)||!byStudent(a.studentId)?.active||seen.has(l.key+'|'+a.studentId))continue;const value=D.attendanceValue(state(),l,a.studentId);if(!value.locked)continue;const s=byStudent(a.studentId);rows.push([l.date,c.code,l.periodName,s.code,fullName(s),value.status,value.comment]);seen.add(l.key+'|'+a.studentId);}
  download('schooldesk-attendance-'+today+'.csv',D.csv(rows),'text/csv;charset=utf-8');toast('Saved attendance and student attendance types exported.');
}
function exportMarks() {
  if(ui.markDirty)throw new Error('Save your marks before exporting.');const tasks=markTasks(),c=byClass(ui.markClass);if(!c)return;
  const ids=[...new Set([...c.studentIds,...tasks.flatMap(a=>Object.keys(a.marks))])],rows=[['Student number','Student',...tasks.flatMap(a=>[a.title+' score / '+a.max,a.title+' %']),'Overall Percentage','Overall Grade']];
  for(const id of ids){const s=byStudent(id),total=D.overall(state(),id,ui.markClass,ui.markYear);rows.push([s.code,fullName(s),...tasks.flatMap(a=>{const m=a.marks[id];return[m??'',m===undefined?'':Number((m/a.max*100).toFixed(2))];}),total.percent===null?'':Number(total.percent.toFixed(2)),total.grade]);}
  download('schooldesk-marksbook-'+today+'.csv',D.csv(rows),'text/csv;charset=utf-8');toast('Yearly marksbook exported.');
}
function exportOriginal() {
  const raw=store.storage?.getItem(D.STORAGE_KEY);if(!raw)return toast('No original saved data found.',true);
  download('schooldesk-original-saved-data.json',raw,'application/json');
}

const actions={
 'close-dialog':closeDialog,'student-view':studentView,'new-student':()=>studentForm(),'edit-student':id=>{if(discard()){render();studentForm(id);}},'student-note':id=>noteForm('',id),
 'new-class':()=>classForm(),'edit-class':id=>{if(discard()){render();classForm(id);}},'class-roll':id=>go('attendance',{rollClass:id,rollDate:today}),'next-class-roll':id=>go('attendance',{rollClass:id,rollDate:D.nextSchoolDay(today)}),'class-plan':id=>go('planner',{planClass:id}),
 'new-plan':()=>planForm(),'edit-plan':id=>planForm(id),'duplicate-plan':id=>planForm(id,'',true),'view-plan':planView,'delete-plan':id=>deleteRecord('plans',id,'lesson plan'),
 'new-assessment':()=>assessmentForm(),'edit-assessment':assessmentForm,'open-marks':id=>{const a=state().assessments.find(a=>a.id===id);go('assessments',{markClass:a.classId,markYear:a.yearId});},'save-marks':saveMarks,'delete-assessment':id=>deleteRecord('assessments',id,'assessment and its marks'),
 'new-lesson':()=>lessonForm(),'edit-lesson':lessonForm,'delete-lesson':id=>deleteRecord('lessons',id,'timetable session'),'previous-week':()=>{ui.week=D.shiftDate(ui.week,-7);render();},'next-week':()=>{ui.week=D.shiftDate(ui.week,7);render();},'this-week':()=>{ui.week=D.weekStart(today);render();},
 'new-note':()=>noteForm(),'edit-note':noteForm,'toggle-note':id=>{commit(s=>{const n=s.notes.find(n=>n.id===id);n.status=n.status==='Open'?'Closed':'Open';},'Follow-up status updated.');render();},
 'new-notice':()=>noticeForm(),'edit-notice':noticeForm,'delete-notice':id=>deleteRecord('notices',id,'notice'),
 'save-roll':saveRoll,'all-present':markSelectedPresent,
 'export-students':exportStudents,'export-attendance':exportAttendance,'export-marks':exportMarks,'backup':backup,'restore':()=>$('restore-input').click(),'print':()=>window.print(),
 'export-original':exportOriginal,
 'reset':()=>{if(!window.confirm('Replace this entire workspace with fictional demo data? All current saved records will be removed from this browser. Download a backup first if you need them.'))return;store.commit(D.seed(),true);ui.rollDirty=false;ui.markDirty=false;ui.rollDraft={};ui.markDraft={};warning();render();toast('Fictional demo workspace restored.');}
};
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-page],[data-action]');if(!el)return;event.preventDefault();
 try{if(el.dataset.page){if($('dialog').open)closeDialog();go(el.dataset.page);return;}const action=el.dataset.action;if(action.startsWith('nav-'))go(action.slice(4));else actions[action]?.(el.dataset.id,el,event);}catch(error){toast(error.message,true);}
});
Object.assign(actions,{
 'attendance-cell':markCell,
 'select-attendance-lesson':key=>{const l=sessionFromKey(key);ui.rollDate=l.date;ui.rollPeriod=l.periodId;ui.attendanceFocus=key;render();},
 'session-open':sessionMenu,
 'session-attendance':key=>{const l=sessionFromKey(key);if(go('attendance',{rollClass:l.classId,rollDate:l.date,rollPeriod:l.periodId,rollTerm:D.termAt(state(),l.date)?.id,attendanceFocus:key})!==false)closeDialog();},
 'session-marks':key=>{const l=sessionFromKey(key);go('assessments',{markClass:l.classId,markYear:D.yearAt(state(),l.date)?.id});closeDialog();},
 'session-plan':key=>{const l=sessionFromKey(key),p=planFor(l);ui.planDate=l.date;if(p)planView(p.id);else planForm('',key);},
 'planner-day':()=>{ui.planMode='day';render();},'planner-week':()=>{ui.planMode='week';render();},
 'planner-previous':()=>{ui.planDate=D.shiftDate(ui.planDate,ui.planMode==='day'?-1:-7);render();},'planner-next':()=>{ui.planDate=D.shiftDate(ui.planDate,ui.planMode==='day'?1:7);render();},'planner-today':()=>{ui.planDate=today;render();},
 'manage-absences':id=>{if(discard()){render();manageAbsences(id);}},'new-absence':id=>absenceForm('',id),'edit-absence':id=>absenceForm(id),
 'delete-absence':id=>{const a=state().absences.find(a=>a.id===id);if(window.confirm('Remove this student attendance entry?')){commit(s=>{s.absences=s.absences.filter(a=>a.id!==id);},'Student attendance entry removed.');render();manageAbsences(a.studentId);}},
 'new-year':()=>calendarForm('year'),'edit-year':id=>calendarForm('year',id),'delete-year':id=>deleteCalendar('year',id),
 'new-term':()=>calendarForm('term'),'edit-term':id=>calendarForm('term',id),'delete-term':id=>deleteCalendar('term',id),
 'new-holiday':()=>calendarForm('holiday'),'edit-holiday':id=>calendarForm('holiday',id),'delete-holiday':id=>deleteCalendar('holiday',id),
 'new-special':()=>specialForm(),'edit-special':id=>specialForm(id),'special-date':date=>specialForm('',date),'delete-special':id=>deleteCalendar('special',id),
 'copy-regular-special':(_id,el)=>{const f=el.closest('form'),fd=new FormData(f),date=String(fd.get('date'));if(!D.dateValid(date))throw new Error('Choose a valid date before copying the regular timetable.');const day=new Date(date+'T12:00:00').getDay();for(const p of teachingPeriods()){const l=state().lessons.find(l=>l.day===day&&l.periodId===p.id);f.elements['class_'+p.id].value=l?.classId||'';f.elements['title_'+p.id].value='';f.elements['room_'+p.id].value=l?.room||'';}toast('Regular weekday classes copied into this date.');}
});
const fieldsFor={student:['firstName','lastName','code','year','homegroup','guardian','email','phone','support'],class:['name','code','year','room','colour'],assessment:['classId','yearId','title','due','description'],plan:['classId','date','periodId','title','objective','activities','resources'],lesson:['classId','periodId','room'],note:['studentId','category','text','date','status'],notice:['title','category','date','body'],settings:['school','teacher','role','theme']};
document.addEventListener('submit',event=>{
 const el=event.target,kind=el.dataset.form;if(!kind)return;event.preventDefault();
 const id=el.dataset.id,fd=new FormData(el),value=Object.fromEntries((fieldsFor[kind]||[]).map(k=>[k,String(fd.get(k)||'').trim()]));
 try{
  if(saveV2Form(kind,fd,id)){closeDialog();render();if(kind==='absence')manageAbsences(ui.absenceStudent);return;}
  if(kind==='student'){
   if(state().students.some(s=>s.code.toLowerCase()===value.code.toLowerCase()&&s.id!==id))throw new Error('That student number is already in use.');
   value.active=fd.get('active')==='true';const record={...value,id:id||D.uid('s')};commit(s=>{const i=s.students.findIndex(x=>x.id===id);if(i<0)s.students.push(record);else s.students[i]=record;},'Student record saved.');
  }else if(kind==='class'){
   if(state().classes.some(c=>c.code.toLowerCase()===value.code.toLowerCase()&&c.id!==id))throw new Error('That class code is already in use.');
   value.studentIds=fd.getAll('studentIds');const record={...value,id:id||D.uid('c')};commit(s=>{const i=s.classes.findIndex(x=>x.id===id);if(i<0)s.classes.push(record);else s.classes[i]=record;},'Class and roster saved.');
  }else if(kind==='assessment'){
   const max=Number(fd.get('max')),old=state().assessments.find(a=>a.id===id);if(Object.values(old?.marks||{}).some(mark=>mark>max))throw new Error('The maximum cannot be below an existing mark. Adjust those marks first.');
   const record={...value,id:id||D.uid('a'),max,marks:old?.marks||{}};commit(s=>{const i=s.assessments.findIndex(x=>x.id===id);if(i<0)s.assessments.push(record);else s.assessments[i]=record;},'Assessment saved.');ui.markClass=record.classId;ui.markYear=record.yearId;ui.markDraft={};ui.markDirty=false;
  }else if(kind==='plan'){
   const old=state().plans.find(p=>p.id===id),scheduled=D.sessionsOn(state(),value.date).some(l=>l.classId===value.classId&&l.periodId===value.periodId);if(!scheduled&&!(old&&old.date===value.date&&old.classId===value.classId&&old.periodId===value.periodId))throw new Error('Choose a timetabled class and period on a teaching date.');
   const record={...value,id:id||D.uid('p')};commit(s=>{const i=s.plans.findIndex(x=>x.id===id);if(i<0)s.plans.push(record);else s.plans[i]=record;},'Lesson plan saved.');
  }else if(kind==='lesson'){
   value.day=Number(fd.get('day'));if(state().lessons.some(l=>l.id!==id&&l.day===value.day&&l.periodId===value.periodId))throw new Error('This period overlaps another recurring class.');
   const record={...value,id:id||D.uid('l')};commit(s=>{const i=s.lessons.findIndex(x=>x.id===id);if(i<0)s.lessons.push(record);else s.lessons[i]=record;},'Timetable updated.');
  }else if(kind==='note'){
   const old=state().notes.find(n=>n.id===id),record={...value,id:id||D.uid('n'),author:old?.author||state().settings.teacher};commit(s=>{const i=s.notes.findIndex(x=>x.id===id);if(i<0)s.notes.push(record);else s.notes[i]=record;},'Pastoral care record saved.');
  }else if(kind==='notice'){
   const record={...value,id:id||D.uid('b')};commit(s=>{const i=s.notices.findIndex(x=>x.id===id);if(i<0)s.notices.push(record);else s.notices[i]=record;},'Notice saved.');
  }else if(kind==='settings'){commit(s=>{s.settings=value;},'Workspace settings saved.');}
  if(kind!=='settings')closeDialog();render();
 }catch(error){el.querySelector('.form-error').textContent=error.message;}
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='student-search'){ui.studentSearch=el.value;render(true);}
 else if(el.id==='pastoral-search'){ui.pastoralSearch=el.value;render(true);}
 else if(el.id==='global-search')$('global-results').innerHTML=searchResults(el.value);
 else if(el.dataset.mark)updateMarkInput(el);
});
document.addEventListener('change',event=>{
 const el=event.target,map={'student-year':'year','student-status':'studentStatus','pastoral-status':'pastoralFilter','notice-category':'noticeFilter','plan-class':'planClass'};
 if(map[el.id]){ui[map[el.id]]=el.value;render();}
 else if(['roll-class','roll-term','roll-date','roll-period','marks-class','marks-year','planner-date'].includes(el.id)){
  const key={'roll-class':'rollClass','roll-term':'rollTerm','roll-date':'rollDate','roll-period':'rollPeriod','marks-class':'markClass','marks-year':'markYear','planner-date':'planDate'}[el.id],prev=ui[key];
  if(el.type==='date'&&!D.dateValid(el.value)){el.value=prev;return;}
  if(!discard()){el.value=prev;return;}ui[key]=el.value;
  if(el.id==='roll-date'){const term=D.termAt(state(),el.value);if(term)ui.rollTerm=term.id;}
  render();
 }else if(['plan-form-class','plan-form-date'].includes(el.id)){
  const f=el.closest('form'),fd=new FormData(f),old=state().plans.find(p=>p.id===f.dataset.id);
  $('plan-form-period').innerHTML=planPeriodOptions(String(fd.get('classId')),String(fd.get('date')),'',old);
 }
});
$('restore-input').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 try{if(file.size>10*1024*1024)throw new Error('Backup is too large (maximum 10 MB).');const next=D.parseBackup(await file.text());if(!window.confirm(`Restore ${next.settings.school} with ${next.students.length} students? This replaces all current records and unsaved edits in this browser.`))return;store.commit(next,true);ui.rollDirty=false;ui.markDirty=false;ui.rollDraft={};ui.markDraft={};warning();render();toast('Workspace restored from backup.');}catch(error){toast(error.message,true);}
});
$('search-launch').addEventListener('click',openSearch);
$('profile-button').addEventListener('click',()=>go('settings'));
$('menu-button').innerHTML=icon('menu');$('search-icon').innerHTML=icon('search');
$('menu-button').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu-button').setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!$('dialog').open&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();openSearch();}if(event.key==='Escape'){$('sidebar').classList.remove('open');$('menu-button').setAttribute('aria-expanded','false');}});
$('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
window.addEventListener('storage',event=>{if(event.key===D.STORAGE_KEY||event.key===null){store.blocked=true;store.warning='This workspace changed in another tab. Export your saved records if needed, then reload to load the latest version before making more changes.';warning();}});
window.addEventListener('hashchange',()=>{const page=location.hash.slice(1);if(page!==ui.page){if(discard()){ui.page=nav.some(n=>n[0]===page)?page:'overview';render();}else history.replaceState(null,'','#'+ui.page);}});
const page=location.hash.slice(1);if(nav.some(n=>n[0]===page))ui.page=page;render();
})();
