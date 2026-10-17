/* Runtime integration checks with a minimal DOM harness, not a browser layout test. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=require('../core.js');

function workspace(saved=D.seed('2026-10-17')){
 const elements=new Map(),events={},windowEvents={},downloads=[],forms=[];
 class Element {
  constructor(id=''){this.id=id;this.innerHTML='';this.textContent='';this.dataset={};this.open=false;this.value='';this.hidden=false;this.listeners={};this.attributes={};this.isConnected=true;this.className='';this.style={};this.classList={add:()=>{},remove:()=>{},toggle:()=>true};}
  addEventListener(name,fn){this.listeners[name]=fn}
  setAttribute(k,v){this.attributes[k]=v}
  focus(){document.activeElement=this}
  showModal(){this.open=true}
  close(){this.open=false}
  querySelector(){this.error??=new Element();return this.error}
  querySelectorAll(){return []}
  click(){downloads.push(this.download)}
 }
 const document={activeElement:null,documentElement:{setAttribute(){}},querySelector(){return null},getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)},querySelectorAll(selector){return selector==='form[data-form]'?forms:[]},addEventListener(name,fn){events[name]=fn},createElement(){return new Element()}};
 const extraStorage=new Map(),storage={raw:saved?JSON.stringify(saved):null,getItem(k){return k===D.STORAGE_KEY?this.raw:extraStorage.get(k)||null},setItem(k,v){if(k===D.STORAGE_KEY)this.raw=v;else extraStorage.set(k,v)}};
 let confirms=true;
 const window={SchoolDesk:{...D,isoDate:d=>D.isoDate(d||new Date('2026-10-19T12:00:00'))},localStorage:storage,confirm:()=>confirms,addEventListener(name,fn){windowEvents[name]=fn},print(){}};
 const context={window,document,history:{replaceState(){}},location:{hash:''},Date,console,Blob,URL,setTimeout:()=>1,clearTimeout(){},FormData:class {constructor(form){this.values=form.values||{}}keys(){return Object.keys(this.values).values()}get(k){return this.values[k]??null}getAll(k){const v=this.values[k];return Array.isArray(v)?v:v?[v]:[]}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8').replace(/\}\)\(\);\s*$/, 'window.__test={ui,store,collectEnrolments,rosterChoices,selectedRoster,preparePastedMarks,persistFormDraft,recoverForm,readDrafts,saveWorkDraft,handleV3Change,handleV3Input};})();'),context,{filename:'app.js'});
 function click(action,id='',extra={},modifiers={}){const element=new Element();element.dataset={action,id,...extra};element.closest=()=>element;events.click({target:element,shiftKey:false,altKey:false,...modifiers,preventDefault(){}});return element;}
 function page(name){const element=new Element();element.dataset={page:name};element.closest=()=>element;events.click({target:element,preventDefault(){}});}
 function input(id,value,dataset={}){const element=document.getElementById(id);element.value=value;element.dataset=dataset;events.input({target:element});}
 function change(id,value){const element=document.getElementById(id);element.value=value;events.change({target:element});}
 function submit(kind,values,id=''){const form=new Element();form.dataset={form:kind,id};form.values=values;events.submit({target:form,preventDefault(){}});return form.error?.textContent||'';}
 return {api:window.__test,Element,forms,document,storage,windowEvents,events,page,click,input,change,submit,downloads,html:()=>document.getElementById('main').innerHTML,dialog:()=>document.getElementById('dialog').innerHTML,data:()=>JSON.parse(storage.raw||JSON.stringify(saved)),setConfirm:value=>confirms=value};
}

test('every workspace screen renders with connected demo records',()=>{
 const w=workspace();for(const name of ['overview','students','classes','attendance','planner','assessments','timetable','pastoral','notices','settings']){w.page(name);assert.ok(w.html().includes('page-heading'),name);assert.ok(!w.html().includes('[object Object]'),name);assert.ok(!w.html().includes('undefined'),name);}
});
test('all create and edit dialogs render; profiles show results and care history',()=>{
 const w=workspace();for(const [action,id,title]of [['new-student','','Add a student'],['edit-student','s1','Edit student'],['new-class','','Create a class'],['edit-class','c1','Edit class'],['new-plan','','Plan a lesson'],['edit-plan','p1','Edit lesson'],['new-assessment','','Create an assessment'],['edit-assessment','a1','Edit assessment'],['new-lesson','','Add a recurring class'],['edit-lesson','l1','Edit recurring class'],['new-note','','Add a pastoral record'],['edit-note','n1','Edit pastoral record'],['new-notice','','Write a notice'],['edit-notice','b1','Edit notice']]){w.click(action,id);assert.ok(w.dialog().includes(title),action);assert.ok(!w.dialog().includes('undefined'),action);w.click('close-dialog');}w.click('student-view','s3');assert.ok(w.dialog().includes('Assessment results'));assert.ok(w.dialog().includes('Learning support'));assert.ok(w.dialog().includes('planning scaffold'));
});
test('student numbers are generated, immutable on edit and names may repeat',()=>{
 const w=workspace();const values={firstName:'New',preferredName:'Neo',lastName:'Learner',code:'IGNORED',year:'9',homegroup:'9 Test',schoolStart:'2026-10-19',guardian:'Test caregiver',email:'test@example.com',phone:'',support:''};
 assert.equal(w.submit('student',values),'');let student=w.data().students.find(s=>s.firstName==='New');assert.match(student.code,/^SD\d{6}$/);assert.equal(student.preferredName,'Neo');
 assert.equal(w.submit('student',values),'');assert.equal(w.data().students.filter(s=>s.firstName==='New').length,2);assert.equal(new Set(w.data().students.map(s=>s.code)).size,w.data().students.length);
 assert.equal(w.submit('student',{...values,code:'CHANGED'},student.id),'');assert.equal(w.data().students.find(s=>s.id===student.id).code,student.code);
 assert.equal(w.submit('lifecycle',{kind:'archive-student',date:'2026-10-20'},student.id),'');assert.equal(D.studentEnrolled(w.data().students.find(s=>s.id===student.id),'2026-10-20'),false);
});
test('class, planner, notice and pastoral forms save and remain connected',()=>{
 const w=workspace();w.click('new-class');for(const id of ['s1','s2']){w.api.ui.rosterSelected.add(id);w.api.ui.rosterEnrolments.push({studentId:id,start:'2026-10-19',end:''});}assert.equal(w.submit('class',{yearId:'y2026',membershipDate:'2026-10-19',name:'Science',code:'9SCI.1',year:'9',room:'S1',colour:'blue',studentIds:['s1','s2']}),'');const c=w.data().classes.find(c=>c.code==='9SCI.1');assert.equal(c.studentIds.length,2);
 assert.equal(w.submit('lesson',{effectiveFrom:'2026-10-19',classId:c.id,day:'2',periodId:'p4',room:'S1'}),'');
 assert.equal(w.submit('plan',{classId:c.id,date:'2026-10-20',periodId:'p4',title:'Investigation',objective:'Ask a question',activities:'Experiment',resources:'Notebook'}),'');assert.ok(w.data().plans.find(p=>p.classId===c.id));
 assert.equal(w.submit('notice',{title:'Meeting',body:'Bring notes.',date:'2026-10-20',category:'Staff notice'}),'');assert.ok(w.data().notices.find(n=>n.title==='Meeting'));
 assert.equal(w.submit('note',{studentId:'s1',category:'Wellbeing',text:'Follow up next week.',date:'2026-10-20',status:'Open'}),'');const note=w.data().notes.find(n=>n.text==='Follow up next week.');w.click('toggle-note',note.id);assert.equal(w.data().notes.find(n=>n.id===note.id).status,'Closed');
});
test('attendance saves a selected lesson and preserves previous dates',()=>{
 const w=workspace(),before=D.seed('2026-10-17').attendance[0].id;w.page('attendance');w.click('save-roll');assert.match(w.document.getElementById('toast').textContent,/already saved/);
 w.click('all-present');w.click('save-roll');const s=w.data();assert.equal(s.attendance.length,2);assert.ok(s.attendance.find(r=>r.id===before));const latest=s.attendance.find(r=>r.id!==before);assert.ok(Object.values(latest.rows).every(r=>r.status==='Present'));
 const reopened=workspace(s);reopened.page('attendance');assert.ok(reopened.html().includes('All attendance saved'));
});
test('marks distinguish a zero result, unmarked entries and invalid scores',()=>{
 const w=workspace();w.page('assessments');w.input('mark-a1-s1','0',{mark:'s1',assessment:'a1'});w.input('mark-a1-s2','',{mark:'s2',assessment:'a1'});w.click('save-marks');assert.equal(w.data().assessments.find(a=>a.id==='a1').marks.s1,0);assert.equal(Object.hasOwn(w.data().assessments.find(a=>a.id==='a1').marks,'s2'),false);
 w.input('mark-a1-s1','999',{mark:'s1',assessment:'a1'});w.click('save-marks');assert.match(w.document.getElementById('toast').textContent,/between 0 and 30/);assert.equal(w.data().assessments.find(a=>a.id==='a1').marks.s1,0);
});
test('unsaved navigation can be cancelled and beforeunload warns',()=>{
 const w=workspace();w.page('attendance');w.click('all-present');w.setConfirm(false);w.page('students');assert.ok(w.html().includes('Class attendance'));let prevented=false;w.windowEvents.beforeunload({preventDefault(){prevented=true}});assert.equal(prevented,true);w.setConfirm(true);w.page('students');assert.ok(w.html().includes('Student directory'));
});
test('timetable rejects conflicting lessons and assessment maximum protects marks',()=>{
 const w=workspace();assert.match(w.submit('lesson',{effectiveFrom:'2026-10-19',classId:'c1',day:'1',periodId:'p1',room:'H2'}),/overlaps/);
 assert.match(w.submit('assessment',{classId:'c1',title:'Existing',due:'2026-10-20',max:'5',description:''},'a1'),/below an existing mark/);
 assert.equal(w.submit('lesson',{effectiveFrom:'2026-10-19',classId:'c1',day:'2',periodId:'p4',room:'H2'}),'');assert.ok(D.recurringOn(w.data(),'2026-10-19').find(l=>l.day===2&&l.periodId==='p4'));
});
test('imported text is escaped in directory, profile, notices and lesson views',()=>{
 const s=D.seed();const payload='<img src=x onerror=alert(1)>';s.students[0].firstName=payload;s.notices[0].title=payload;s.plans[0].activities=payload;const w=workspace(s);w.page('students');assert.ok(!w.html().includes(payload));assert.ok(w.html().includes('&lt;img'));w.click('student-view','s1');assert.ok(!w.dialog().includes(payload));w.page('notices');assert.ok(!w.html().includes(payload));w.click('view-plan','p1');assert.ok(!w.dialog().includes(payload));
});
test('storage changes in another tab block overwriting stale data',()=>{
 const w=workspace();w.windowEvents.storage({key:D.STORAGE_KEY});assert.ok(w.document.getElementById('storage-warning').textContent.includes('another tab'));const result=w.submit('settings',{school:'Stale overwrite',teacher:'Teacher',role:'Teacher',theme:'forest'});assert.match(result,/restore/i);assert.notEqual(w.data().settings.school,'Stale overwrite');
});

test('settings exposes colour, years, terms, holidays, special dates and all period times',()=>{
 const w=workspace();w.page('settings');for(const text of ['Colour scheme','School years','School terms','School &amp; public holidays','Special Timetable','Timetable periods'])assert.ok(w.html().includes(text)||w.html().includes(text.replace('&amp;','&')),text);
 for(const [action,title]of [['new-year','school year'],['new-term','school term'],['new-holiday','holiday'],['new-special','Special Timetable']]){w.click(action);assert.ok(w.dialog().includes(title));assert.ok(!w.dialog().includes('undefined'));}
});
test('theme preference saves and survives opening the workspace again',()=>{
 const w=workspace();assert.equal(w.submit('settings',{school:'Test College',teacher:'Luke',role:'Teacher',theme:'ocean'}),'');assert.equal(w.data().settings.theme,'ocean');const reopened=workspace(w.data());reopened.page('settings');assert.ok(reopened.html().includes('value="ocean" selected'));assert.equal(reopened.data().settings.school,'Test College');
});
test('calendar form edits validate inclusive holiday ranges and term containment',()=>{
 const w=workspace();assert.equal(w.submit('year',{name:'2028',start:'2028-01-26',end:'2028-12-18'}),'');const year=w.data().calendar.years.find(y=>y.name==='2028');assert.ok(year);
 assert.match(w.submit('term',{name:'Bad term',yearId:year.id,start:'2027-12-01',end:'2028-02-01'}),/inside/);
 assert.equal(w.submit('term',{name:'Term 1',yearId:year.id,start:'2028-01-26',end:'2028-04-02'}),'');
 assert.equal(w.submit('holiday',{name:'Local holiday',type:'Public Holiday',start:'2026-10-19',end:'2026-10-19'}),'');w.page('timetable');assert.ok(w.html().includes('Public Holiday'));assert.ok(w.html().includes('rowspan="9"'));assert.ok(!w.html().includes('data-id="2026-10-19|c1|p1"'));
});
test('special timetable forms replace one day, appear in weekly planner, and preserve recurrence',()=>{
 const w=workspace(),before=w.data().lessons;assert.equal(w.submit('special',{date:'2026-10-19',label:'Event day',class_p3:'c2',title_p3:'English workshop',room_p3:'Library'}),'');assert.deepEqual(w.data().lessons,before);
 w.page('timetable');assert.ok(w.html().includes('English workshop'));assert.ok(w.html().includes('Special Timetable'));assert.ok(!w.html().includes('data-id="2026-10-19|c1|p1"'));assert.ok(w.html().includes('data-id="2026-10-19|c2|p3"'));
 w.page('planner');assert.ok(w.html().includes('Event day'));assert.ok(w.html().includes('data-id="2026-10-19|c2|p3"'));assert.ok(!w.html().includes('data-id="2026-10-19|c1|p1"'));
 w.page('timetable');w.click('next-week');assert.ok(w.html().includes('data-id="2026-10-26|c1|p1"'));
});
test('timetable class menu opens date/class-specific attendance, marksbook and lesson plan',()=>{
 const w=workspace(),key='2026-10-19|c1|p1';w.page('timetable');w.click('session-open',key);for(const label of ['Attendance','Marksbook','Lesson Plan'])assert.ok(w.dialog().includes(label));
 w.click('session-attendance',key);assert.ok(w.html().includes('Class attendance'));assert.ok(w.html().includes('Term 4'));assert.ok(w.html().includes('value="2026-10-19"'));assert.ok(w.html().includes('value="p1" selected'));
 w.page('timetable');w.click('session-open',key);w.click('session-marks',key);assert.ok(w.html().includes('Yearly marksbook'));assert.ok(w.html().includes('value="c1" selected'));assert.ok(w.html().includes('value="y2026" selected'));
 w.page('timetable');w.click('session-open',key);w.click('session-plan',key);assert.ok(w.dialog().includes('Interpreting wartime sources'));assert.ok(w.dialog().includes('Period 1'));
 w.click('session-plan','2026-10-19|c2|p2');assert.ok(w.dialog().includes('value="2026-10-19"'));assert.ok(w.dialog().includes('value="p2" selected'));
});
test('attendance cell click cycles Present/Absent, Shift-click marks Late and Alt-click clears',()=>{
 const w=workspace(),session='2026-10-19|c1|p1';w.page('attendance');let el=w.click('attendance-cell','s1',{session});assert.equal(el.title,'Present');w.click('save-roll');assert.equal(w.data().attendance.find(r=>r.id===session).rows.s1.status,'Present');
 el=w.click('attendance-cell','s1',{session});assert.equal(el.title,'Absent');w.click('save-roll');assert.equal(w.data().attendance.find(r=>r.id===session).rows.s1.status,'Absent');
 el=w.click('attendance-cell','s1',{session},{shiftKey:true});assert.equal(el.title,'Late');w.click('save-roll');assert.equal(w.data().attendance.find(r=>r.id===session).rows.s1.status,'Late');
 el=w.click('attendance-cell','s1',{session},{altKey:true});assert.equal(el.title,'Unmarked');w.click('save-roll');assert.equal(Object.hasOwn(w.data().attendance.find(r=>r.id===session).rows,'s1'),false);
});
test('student-screen attendance displays icon tooltips and is protected against click and Shift-click',()=>{
 const w=workspace(),session='2026-10-19|c1|p1';assert.equal(w.submit('absence',{studentId:'s1',type:'Music lesson',start:'2026-10-19',end:'2026-10-19',periodIds:['p1'],comment:'Instrument tuition'}),'');w.page('attendance');assert.ok(w.html().includes('title="Music lesson"'));assert.ok(w.html().includes('data-locked="true"'));
 w.click('attendance-cell','s1',{session,locked:'true'});assert.match(w.document.getElementById('toast').textContent,/read-only/);
 w.click('attendance-cell','s1',{session},{shiftKey:true});assert.match(w.document.getElementById('toast').textContent,/student screen/);assert.equal(w.data().absences[0].type,'Music lesson');assert.ok(!w.data().attendance.find(r=>r.id===session));
 w.click('all-present');w.click('save-roll');const rows=w.data().attendance.find(r=>r.id===session).rows;assert.equal(Object.hasOwn(rows,'s1'),false);assert.equal(rows.s2.status,'Present');
});
test('student attendance can be edited and removed only in the profile management flow',()=>{
 const w=workspace();w.click('student-view','s1');assert.ok(w.dialog().includes('Manage student attendance'));w.click('manage-absences','s1');assert.ok(w.dialog().includes('Add attendance type'));assert.equal(w.submit('absence',{studentId:'s1',type:'Camp',start:'2026-10-19',end:'2026-10-21',periodIds:[],comment:'Three days'}),'');const a=w.data().absences[0];assert.ok(w.dialog().includes('Camp'));assert.equal(w.submit('absence',{...a,type:'Excursion'},a.id),'');assert.equal(w.data().absences[0].type,'Excursion');w.click('delete-absence',a.id);assert.equal(w.data().absences.length,0);
});
test('marksbook shows all selected-year assignments with score/percent pairs and final overall columns',()=>{
 const s=D.seed('2026-10-17');s.assessments.push({id:'a4',classId:'c1',yearId:'y2026',title:'Earlier assessment',due:'2026-03-02',max:20,description:'',statuses:{},weight:0,marks:{s1:15}},{id:'a5',classId:'c1',yearId:'y2027',title:'Next year only',due:'2027-03-02',max:50,description:'',statuses:{},weight:0,marks:{s1:50}});const w=workspace(s);w.page('assessments');const html=w.html();assert.ok(html.includes('Earlier assessment'));assert.ok(html.includes('World War II'));assert.ok(!html.includes('Next year only'));assert.ok(html.includes('data-assessment="a4"'));assert.ok(html.includes('id="percent-a4-s1"'));assert.ok(html.indexOf('Overall<br>Percentage')>html.indexOf('World War II'));assert.ok(html.indexOf('Overall<br>Grade')>html.indexOf('Overall<br>Percentage'));w.change('marks-year','y2027');assert.ok(w.html().includes('Next year only'));assert.ok(!w.html().includes('Earlier assessment'));
});
test('typing scores updates adjacent percentages and overall grade before saving',()=>{
 const s=D.seed('2026-10-17');s.assessments.push({id:'a4',classId:'c1',yearId:'y2026',title:'Second assessment',due:'2026-10-30',max:20,description:'',statuses:{},weight:0,marks:{}});const w=workspace(s);w.page('assessments');w.input('mark-a1-s1','15',{mark:'s1',assessment:'a1'});assert.equal(w.document.getElementById('percent-a1-s1').textContent,'50%');assert.equal(w.document.getElementById('overall-percent-s1').textContent,'50%');assert.equal(w.document.getElementById('overall-grade-s1').textContent,'C');w.input('mark-a4-s1','20',{mark:'s1',assessment:'a4'});assert.equal(w.document.getElementById('percent-a4-s1').textContent,'100%');assert.equal(w.document.getElementById('overall-percent-s1').textContent,'70%');assert.equal(w.document.getElementById('overall-grade-s1').textContent,'B');w.click('save-marks');assert.equal(w.data().assessments.find(a=>a.id==='a4').marks.s1,20);assert.equal(w.data().assessments.find(a=>a.id==='a1').marks.s1,15);
});
test('weekly and daily planner entries come from every scheduled class, with no holiday entries',()=>{
 const s=D.seed('2026-10-17'),w=workspace(s);w.page('planner');assert.ok(w.html().includes('planner-view weekly'));for(const l of D.occurrences(s,'2026-10-19','2026-10-23'))assert.ok(w.html().includes('data-id="'+l.key+'"'),l.key);w.click('planner-day');assert.ok(w.html().includes('planner-view daily'));assert.ok(w.html().includes('2026-10-19|c1|p1'));assert.ok(!w.html().includes('2026-10-20|c1|p1'));assert.equal(w.submit('holiday',{name:'Day off',type:'Public Holiday',start:'2026-10-19',end:'2026-10-19'}),'');assert.ok(w.html().includes('Public Holiday'));assert.ok(!w.html().includes('data-id="2026-10-19|c1|p1"'));assert.ok(w.html().includes('Saved plans outside the current timetable'));
});
test('new lesson plans require an actual timetabled session and reject duplicate slots',()=>{
 const w=workspace();const fields={classId:'c1',date:'2026-10-19',periodId:'p1',title:'Another plan',objective:'',activities:'',resources:''};assert.match(w.submit('plan',fields),/already has/);assert.match(w.submit('plan',{...fields,date:'2026-10-17'}),/teaching date/);assert.equal(w.submit('plan',{...fields,date:'2026-10-26'}),'');assert.ok(w.data().plans.some(p=>p.date==='2026-10-26'&&p.periodId==='p1'));
});
test('version 1 backup restore upgrades records and a corrupt restore leaves data untouched',async()=>{
 const w=workspace(),old=require('../legacy.js').seed('2026-10-17');old.settings.school='Restored College';const input=w.document.getElementById('restore-input');await input.listeners.change({target:{value:'backup.json',files:[{size:500,text:async()=>JSON.stringify(old)}]}});assert.equal(w.data().version,3);assert.equal(w.data().settings.school,'Restored College');const before=w.storage.raw;await input.listeners.change({target:{value:'bad.json',files:[{size:10,text:async()=>'{broken'}]}});assert.equal(w.storage.raw,before);assert.match(w.document.getElementById('toast').textContent,/valid JSON/);
});
test('all workflows gracefully render an empty school setup',()=>{
 const s=D.seed('2026-10-17');s.classes=[];s.lessons=[];s.timetableVersions=[{id:'empty',effectiveFrom:'1900-01-01',lessons:[]}];s.gradingModes={};s.assessments=[];s.plans=[];s.attendance=[];s.legacyAttendance=[];s.calendar={years:[],terms:[],holidays:[]};D.validateState(s);const w=workspace(s);for(const page of ['overview','classes','attendance','assessments','planner','timetable','settings']){w.page(page);assert.ok(w.html().includes('page-heading'));assert.ok(!w.html().includes('undefined'));}
});



test('class editor shows forty visible swatches and dated roster filters',()=>{
 const w=workspace();w.click('edit-class','c1');assert.equal((w.dialog().match(/class="colour-swatch /g)||[]).length,40);for(const id of ['roster-year','roster-group','roster-status','roster-search','membership-date'])assert.ok(w.dialog().includes('id="'+id+'"'));assert.ok(w.dialog().includes('first day no longer enrolled'));
});
test('filter changes preserve selected students and unchecking closes only current membership',()=>{
 const w=workspace();w.click('edit-class','c1');const selected=[...w.api.ui.rosterSelected],before=w.api.ui.rosterEnrolments.find(e=>e.studentId==='s1').start;w.change('roster-year','12');assert.deepEqual([...w.api.ui.rosterSelected],selected);assert.ok(w.document.getElementById('roster-choices').innerHTML.includes('No matching'));
 w.api.ui.rosterSelected.delete('s1');w.api.ui.rosterDate='2026-10-20';const rows=w.api.collectEnrolments();assert.equal(rows.find(e=>e.studentId==='s1').start,before);assert.equal(rows.find(e=>e.studentId==='s1').end,'2026-10-20');
});
test('explicit class withdrawal dates never create an accidental new enrolment',()=>{
 const w=workspace();w.click('edit-class','c1');const e=w.api.ui.rosterEnrolments.find(e=>e.studentId==='s1');e.end='2026-10-18';const rows=w.api.collectEnrolments().filter(e=>e.studentId==='s1');assert.equal(rows.length,1);assert.equal(rows[0].end,'2026-10-18');assert.ok(w.api.selectedRoster().includes('value="2026-10-18"'));
});
test('student preferred names appear in directory, marksbook and student progress',()=>{
 const s=D.seed('2026-10-17');s.students[0].preferredName='Lex';const expected=D.displayName(s.students[0]),w=workspace(s);w.page('students');assert.ok(w.html().includes(expected));w.page('assessments');assert.ok(w.html().includes(expected));w.click('student-view','s1');for(const text of [expected,'School enrolment','Student progress','Attendance history','open follow-ups'])assert.ok(w.dialog().includes(text),text);
});
test('archiving students requires an effective date and locks the dated attendance grid',()=>{
 const w=workspace();w.click('archive-student','s1');assert.ok(w.dialog().includes('first day no longer enrolled'));assert.equal(w.submit('lifecycle',{kind:'archive-student',date:'2026-10-19'},'s1'),'');w.page('attendance');assert.ok(w.html().includes('not-enrolled'));assert.ok(w.html().includes('title="Not enrolled"'));assert.ok(w.html().includes('data-locked="true"'));
});
test('class archive and restore are exposed without deleting saved work',()=>{
 const w=workspace(),before=w.data().assessments[0].marks;assert.equal(w.submit('lifecycle',{kind:'archive-class',date:'2026-10-19'},'c1'),'');w.page('classes');assert.ok(!w.html().includes('data-action="class-marks" data-id="c1"'));w.change('class-status','Archived');assert.ok(w.html().includes('data-action="restore-class" data-id="c1"'));assert.equal(w.submit('lifecycle',{kind:'restore-class',date:'2026-10-19'},'c1'),'');assert.deepEqual(w.data().assessments[0].marks,before);
});
test('future school-year classes remain editable in the active class list',()=>{
 const s=D.seed('2026-10-17');s.classes[0].yearId='y2027';const w=workspace(s);w.page('classes');assert.ok(w.html().includes('data-action="edit-class" data-id="c1"'));assert.ok(w.html().includes('data-action="archive-class" data-id="c1"'));
});
test('bulk entry adds multiple students with generated numbers and no half-import',()=>{
 const w=workspace();w.click('bulk-students');const fields={start:'2026-10-19',firstName_0:'One',lastName_0:'Student',year_0:'9',homegroup_0:'9A',firstName_1:'Two',lastName_1:'Student',year_1:'10',homegroup_1:'10B'};assert.equal(w.submit('bulk-students',fields),'');assert.equal(w.data().students.length,18);assert.ok(w.data().students.slice(-2).every(s=>/^SD\d{6}$/.test(s.code)));const before=w.storage.raw;assert.match(w.submit('bulk-students',{...fields,lastName_1:''}),/Row 2/);assert.equal(w.storage.raw,before);
});
test('student CSV import previews before committing and generates unique numbers',()=>{
 const w=workspace(),before=w.storage.raw;w.click('student-import');w.document.getElementById('import-student-start').value='2026-10-19';w.document.getElementById('student-import-text').value='First name,Last name,Year,Homegroup,Preferred name\nAlex,Smith,9,9A,Lex';w.click('preview-student-import');assert.ok(w.dialog().includes('Confirm 1 students'));assert.equal(w.storage.raw,before);w.click('confirm-student-import');assert.equal(w.data().students.length,17);assert.equal(w.data().students.at(-1).preferredName,'Lex');assert.match(w.data().students.at(-1).code,/^SD\d{6}$/);
});
test('student import errors leave all previous records untouched',()=>{
 const w=workspace(),before=w.storage.raw;w.document.getElementById('import-student-start').value='2026-10-19';w.document.getElementById('student-import-text').value='First name,Last name,Year,Homegroup\nValid,One,9,9A\nInvalid,Two,20,9A';w.click('preview-student-import');assert.match(w.document.getElementById('toast').textContent,/Row 2/);assert.equal(w.storage.raw,before);
});
test('live class average uses the same marks and statuses as the marksbook',()=>{
 const w=workspace();w.page('assessments');w.input('mark-a1-s1','0',{mark:'s1',assessment:'a1'});const a=w.api.store.data.assessments[0],expected=D.assessmentAverage(w.api.store.data,a,w.api.ui.markDraft.a1,w.api.ui.statusDraft.a1).percent;assert.equal(w.document.getElementById('class-average-a1').textContent,Number(expected.toFixed(2))+'%');assert.ok(w.html().includes('<tfoot>'));assert.ok(w.html().includes('Class Average'));
});
test('marks statuses save and zero missing work counts without keeping an old score',()=>{
 const w=workspace();w.page('assessments');const el=new w.Element();el.dataset={markStatus:'s1',assessment:'a1'};el.value='Not submitted';w.api.handleV3Change(el);w.click('save-marks');const a=w.data().assessments[0];assert.equal(a.statuses.s1,'Not submitted');assert.equal(a.marks.s1,undefined);assert.equal(D.overall(w.data(),'s1','c1','y2026').percent,0);
});
test('weighted forms require one hundred percent and reject changes atomically',()=>{
 const w=workspace(),before=w.storage.raw;w.page('assessments');assert.match(w.submit('weightings',{mode:'weighted',weight_a1:'80'}),/total 100/);assert.equal(w.storage.raw,before);assert.equal(w.submit('weightings',{mode:'weighted',weight_a1:'100'}),'');assert.equal(w.data().gradingModes['c1|y2026'],'weighted');
});
test('pasted marks match unique numbers and preserve blank rows in displayed order',()=>{
 const w=workspace(),a=w.api.store.data.assessments[0],roster=D.yearRoster(w.api.store.data,'c1','y2026'),rows=w.api.preparePastedMarks(a,'15\n\n20\n');assert.equal(rows.length,3);assert.equal(rows[1].studentId,roster[1].id);assert.equal(rows[1].status,'Not marked');assert.equal(rows[2].score,20);
 const mapped=w.api.preparePastedMarks(a,roster[0].code+'\tExempt\n'+roster[1].code+'\t0');assert.equal(mapped[0].status,'Exempt');assert.equal(mapped[1].score,0);assert.throws(()=>w.api.preparePastedMarks(a,roster[0].code+'\t15\n'+roster[0].code+'\t20'),/duplicate/);assert.throws(()=>w.api.preparePastedMarks(a,'Unknown\t20'),/unique student/);assert.throws(()=>w.api.preparePastedMarks(a,'31'),/between/);
});
test('pasted marks preview and apply to a recoverable draft before explicit save',()=>{
 const w=workspace(),before=w.storage.raw;w.page('assessments');w.click('paste-marks');w.document.getElementById('paste-assessment').value='a1';w.document.getElementById('paste-mark-text').value='15';w.click('preview-paste-marks');assert.ok(w.dialog().includes('Confirm pasted marks'));assert.equal(w.storage.raw,before);w.click('apply-pasted-marks');assert.equal(w.storage.raw,before);assert.ok(w.api.readDrafts().marks);w.click('save-marks');assert.ok(Object.values(w.data().assessments[0].marks).includes(15));assert.equal(w.api.readDrafts().marks,undefined);
});
test('marks draft survives navigation and can be recovered before saving',()=>{
 const w=workspace();w.page('assessments');w.input('mark-a1-s1','12',{mark:'s1',assessment:'a1'});w.page('students');assert.equal(w.data().assessments[0].marks.s1,26);assert.equal(w.api.readDrafts().marks.markDraft.a1.s1,'12');w.click('recover-work','marks');assert.equal(w.api.ui.markDirty,true);assert.equal(w.api.ui.markDraft.a1.s1,'12');w.click('save-marks');assert.equal(w.data().assessments[0].marks.s1,12);assert.equal(w.api.readDrafts().marks,undefined);
});
test('attendance draft survives navigation and recovers its date and term context',()=>{
 const w=workspace();w.page('attendance');w.click('attendance-cell','s1',{session:'2026-10-19|c1|p1'});w.page('students');assert.ok(w.api.readDrafts().attendance);w.click('recover-work','attendance');assert.equal(w.api.ui.rollDate,'2026-10-19');assert.equal(w.api.ui.rollDirty,true);w.click('save-roll');assert.equal(w.data().attendance.find(r=>r.id==='2026-10-19|c1|p1').rows.s1.status,'Present');assert.equal(w.api.readDrafts().attendance,undefined);
});
test('main Settings forms and modal forms recover values and warn on unsaved changes',()=>{
 for(const modal of [false,true]){const w=workspace(),f=new w.Element();f.dataset={form:modal?'student':'settings',id:''};f.values={firstName:'Draft',school:'Draft School'};f.closest=selector=>selector==='dialog'&&modal?w.document.getElementById('dialog'):null;const controls=[{name:'firstName',value:''},{name:'school',value:''}];f.querySelectorAll=()=>controls;w.forms.push(f);w.api.persistFormDraft(f);w.api.ui.formDirty=false;w.api.recoverForm((modal?'student':'settings')+':new');assert.equal(controls[1].value,'Draft School');assert.ok(modal?w.api.ui.formDirty:w.api.ui.dirtyForms.has('settings:new'));w.setConfirm(false);w.page('students');assert.notEqual(w.api.ui.page,'students');}
});
test('closing a dirty dialog or pressing Escape can be cancelled without losing the draft',()=>{
 const w=workspace();w.click('new-student');w.api.ui.formDirty=true;w.setConfirm(false);w.click('close-dialog');assert.equal(w.document.getElementById('dialog').open,true);let prevented=false;w.document.getElementById('dialog').listeners.cancel({preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(w.document.getElementById('dialog').open,true);
});
test('timetable room defaults follow class selection until manually overridden',()=>{
 const w=workspace(),room=new w.Element(),f=new w.Element(),el=new w.Element();f.dataset={form:'lesson'};f.values={room:''};f.closest=()=>w.document.getElementById('dialog');f.elements={room};el.name='classId';el.value='c2';el.closest=()=>f;w.api.handleV3Change(el);assert.equal(room.value,w.api.store.data.classes.find(c=>c.id==='c2').room);room.value='Custom';room.name='room';room.closest=()=>f;w.api.handleV3Input(room);el.value='c1';w.api.handleV3Change(el);assert.equal(room.value,'Custom');w.click('new-lesson');assert.ok(w.dialog().includes('data-default-room="true"'));
});
test('saved changes can be undone and redone from the workspace controls',()=>{
 const w=workspace(),before=w.data().settings.school;w.submit('settings',{school:'Changed',teacher:'Luke',role:'Teacher',theme:'forest'});w.click('change-history');assert.ok(w.dialog().includes('Workspace settings saved'));w.click('undo-change');assert.equal(w.data().settings.school,before);w.click('redo-change');assert.equal(w.data().settings.school,'Changed');assert.match(w.data().auditLog.at(-1).summary,/Redid/);
});
test('uniform attendance icons and full-colour timetable blocks are wired in source',()=>{
 const w=workspace();w.page('attendance');const icons=[...w.html().matchAll(/<svg class="attendance-symbol"([^>]*)>/g)];assert.ok(icons.length>=12);assert.ok(icons.every(m=>m[1].includes('viewBox="0 0 24 24" width="22" height="22"')));w.page('timetable');assert.ok(w.html().includes('style="--class-colour:'));const css=fs.readFileSync(require.resolve('../styles.css'),'utf8');assert.match(css,/\.lesson-block[^}]*background:var\(--class-colour/s);assert.ok(css.includes('.not-enrolled'));
});


test('Not marked pasted as the first score is a status rather than a discarded header',()=>{
 const w=workspace(),a=w.api.store.data.assessments[0],roster=D.yearRoster(w.api.store.data,'c1','y2026');const rows=w.api.preparePastedMarks(a,'Not marked\n20');assert.equal(rows.length,2);assert.equal(rows[0].studentId,roster[0].id);assert.equal(rows[0].status,'Not marked');assert.equal(rows[1].studentId,roster[1].id);assert.throws(()=>w.api.preparePastedMarks(a,roster[0].code+'\t20\textra'),/two student/);
});
