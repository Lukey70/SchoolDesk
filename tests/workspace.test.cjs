/* Runtime integration checks with a minimal DOM harness, not a browser layout test. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=require('../core.js');

function workspace(saved=D.seed('2026-10-17')){
 const elements=new Map(),events={},windowEvents={},downloads=[];
 class Element {
  constructor(id=''){this.id=id;this.innerHTML='';this.textContent='';this.dataset={};this.open=false;this.value='';this.hidden=false;this.listeners={};this.attributes={};this.isConnected=true;this.className='';this.classList={add:()=>{},remove:()=>{},toggle:()=>true};}
  addEventListener(name,fn){this.listeners[name]=fn}
  setAttribute(k,v){this.attributes[k]=v}
  focus(){document.activeElement=this}
  showModal(){this.open=true}
  close(){this.open=false}
  querySelector(){this.error??=new Element();return this.error}
  querySelectorAll(){return []}
  click(){downloads.push(this.download)}
 }
 const document={activeElement:null,documentElement:{setAttribute(){}},querySelector(){return null},getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)},querySelectorAll(){return []},addEventListener(name,fn){events[name]=fn},createElement(){return new Element()}};
 const storage={raw:saved?JSON.stringify(saved):null,getItem(){return this.raw},setItem(_k,v){this.raw=v}};
 let confirms=true;
 const window={SchoolDesk:{...D,isoDate:d=>D.isoDate(d||new Date('2026-10-19T12:00:00'))},localStorage:storage,confirm:()=>confirms,addEventListener(name,fn){windowEvents[name]=fn},print(){}};
 const context={window,document,history:{replaceState(){}},location:{hash:''},Date,console,Blob,URL,setTimeout:()=>1,clearTimeout(){},FormData:class {constructor(form){this.values=form.values}get(k){return this.values[k]??null}getAll(k){const v=this.values[k];return Array.isArray(v)?v:v?[v]:[]}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context,{filename:'app.js'});
 function click(action,id='',extra={},modifiers={}){const element=new Element();element.dataset={action,id,...extra};element.closest=()=>element;events.click({target:element,shiftKey:false,altKey:false,...modifiers,preventDefault(){}});return element;}
 function page(name){const element=new Element();element.dataset={page:name};element.closest=()=>element;events.click({target:element,preventDefault(){}});}
 function input(id,value,dataset={}){const element=document.getElementById(id);element.value=value;element.dataset=dataset;events.input({target:element});}
 function change(id,value){const element=document.getElementById(id);element.value=value;events.change({target:element});}
 function submit(kind,values,id=''){const form=new Element();form.dataset={form:kind,id};form.values=values;events.submit({target:form,preventDefault(){}});return form.error?.textContent||'';}
 return {document,storage,windowEvents,events,page,click,input,change,submit,downloads,html:()=>document.getElementById('main').innerHTML,dialog:()=>document.getElementById('dialog').innerHTML,data:()=>JSON.parse(storage.raw||JSON.stringify(saved)),setConfirm:value=>confirms=value};
}

test('every workspace screen renders with connected demo records',()=>{
 const w=workspace();for(const name of ['overview','students','classes','attendance','planner','assessments','timetable','pastoral','notices','settings']){w.page(name);assert.ok(w.html().includes('page-heading'),name);assert.ok(!w.html().includes('[object Object]'),name);assert.ok(!w.html().includes('undefined'),name);}
});
test('all create and edit dialogs render; profiles show results and care history',()=>{
 const w=workspace();for(const [action,id,title]of [['new-student','','Add a student'],['edit-student','s1','Edit student'],['new-class','','Create a class'],['edit-class','c1','Edit class'],['new-plan','','Plan a lesson'],['edit-plan','p1','Edit lesson'],['new-assessment','','Create an assessment'],['edit-assessment','a1','Edit assessment'],['new-lesson','','Add a recurring class'],['edit-lesson','l1','Edit recurring class'],['new-note','','Add a pastoral record'],['edit-note','n1','Edit pastoral record'],['new-notice','','Write a notice'],['edit-notice','b1','Edit notice']]){w.click(action,id);assert.ok(w.dialog().includes(title),action);assert.ok(!w.dialog().includes('undefined'),action);w.click('close-dialog');}w.click('student-view','s3');assert.ok(w.dialog().includes('Assessment results'));assert.ok(w.dialog().includes('Learning support'));assert.ok(w.dialog().includes('planning scaffold'));
});
test('student create, duplicate rejection and archiving persist correctly',()=>{
 const w=workspace();const values={firstName:'New',lastName:'Learner',code:'NEW01',year:'9',homegroup:'9 Test',guardian:'Test caregiver',email:'test@example.com',phone:'',support:'',active:'true'};
 assert.equal(w.submit('student',values),'');const student=w.data().students.find(s=>s.code==='NEW01');assert.ok(student.active);
 assert.match(w.submit('student',values),/already in use/);assert.equal(w.data().students.filter(s=>s.code==='NEW01').length,1);
 assert.equal(w.submit('student',{...values,active:'false'},student.id),'');assert.equal(w.data().students.find(s=>s.id===student.id).active,false);
});
test('class, planner, notice and pastoral forms save and remain connected',()=>{
 const w=workspace();assert.equal(w.submit('class',{name:'Science',code:'9SCI.1',year:'9',room:'S1',colour:'blue',studentIds:['s1','s2']}),'');const c=w.data().classes.find(c=>c.code==='9SCI.1');assert.equal(c.studentIds.length,2);
 assert.equal(w.submit('lesson',{classId:c.id,day:'2',periodId:'p4',room:'S1'}),'');
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
 const w=workspace();assert.match(w.submit('lesson',{classId:'c1',day:'1',periodId:'p1',room:'H2'}),/overlaps/);
 assert.match(w.submit('assessment',{classId:'c1',title:'Existing',due:'2026-10-20',max:'5',description:''},'a1'),/below an existing mark/);
 assert.equal(w.submit('lesson',{classId:'c1',day:'2',periodId:'p4',room:'H2'}),'');assert.ok(w.data().lessons.find(l=>l.day===2&&l.periodId==='p4'));
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
 const s=D.seed('2026-10-17');s.assessments.push({id:'a4',classId:'c1',yearId:'y2026',title:'Earlier assessment',due:'2026-03-02',max:20,description:'',marks:{s1:15}},{id:'a5',classId:'c1',yearId:'y2027',title:'Next year only',due:'2027-03-02',max:50,description:'',marks:{s1:50}});const w=workspace(s);w.page('assessments');const html=w.html();assert.ok(html.includes('Earlier assessment'));assert.ok(html.includes('World War II'));assert.ok(!html.includes('Next year only'));assert.ok(html.includes('data-assessment="a4"'));assert.ok(html.includes('id="percent-a4-s1"'));assert.ok(html.indexOf('Overall<br>Percentage')>html.indexOf('World War II'));assert.ok(html.indexOf('Overall<br>Grade')>html.indexOf('Overall<br>Percentage'));w.change('marks-year','y2027');assert.ok(w.html().includes('Next year only'));assert.ok(!w.html().includes('Earlier assessment'));
});
test('typing scores updates adjacent percentages and overall grade before saving',()=>{
 const s=D.seed('2026-10-17');s.assessments.push({id:'a4',classId:'c1',yearId:'y2026',title:'Second assessment',due:'2026-10-30',max:20,description:'',marks:{}});const w=workspace(s);w.page('assessments');w.input('mark-a1-s1','15',{mark:'s1',assessment:'a1'});assert.equal(w.document.getElementById('percent-a1-s1').textContent,'50%');assert.equal(w.document.getElementById('overall-percent-s1').textContent,'50%');assert.equal(w.document.getElementById('overall-grade-s1').textContent,'C');w.input('mark-a4-s1','20',{mark:'s1',assessment:'a4'});assert.equal(w.document.getElementById('percent-a4-s1').textContent,'100%');assert.equal(w.document.getElementById('overall-percent-s1').textContent,'70%');assert.equal(w.document.getElementById('overall-grade-s1').textContent,'B');w.click('save-marks');assert.equal(w.data().assessments.find(a=>a.id==='a4').marks.s1,20);assert.equal(w.data().assessments.find(a=>a.id==='a1').marks.s1,15);
});
test('weekly and daily planner entries come from every scheduled class, with no holiday entries',()=>{
 const s=D.seed('2026-10-17'),w=workspace(s);w.page('planner');assert.ok(w.html().includes('planner-view weekly'));for(const l of D.occurrences(s,'2026-10-19','2026-10-23'))assert.ok(w.html().includes('data-id="'+l.key+'"'),l.key);w.click('planner-day');assert.ok(w.html().includes('planner-view daily'));assert.ok(w.html().includes('2026-10-19|c1|p1'));assert.ok(!w.html().includes('2026-10-20|c1|p1'));assert.equal(w.submit('holiday',{name:'Day off',type:'Public Holiday',start:'2026-10-19',end:'2026-10-19'}),'');assert.ok(w.html().includes('Public Holiday'));assert.ok(!w.html().includes('data-id="2026-10-19|c1|p1"'));assert.ok(w.html().includes('Saved plans outside the current timetable'));
});
test('new lesson plans require an actual timetabled session and reject duplicate slots',()=>{
 const w=workspace();const fields={classId:'c1',date:'2026-10-19',periodId:'p1',title:'Another plan',objective:'',activities:'',resources:''};assert.match(w.submit('plan',fields),/already has/);assert.match(w.submit('plan',{...fields,date:'2026-10-17'}),/teaching date/);assert.equal(w.submit('plan',{...fields,date:'2026-10-26'}),'');assert.ok(w.data().plans.some(p=>p.date==='2026-10-26'&&p.periodId==='p1'));
});
test('version 1 backup restore upgrades records and a corrupt restore leaves data untouched',async()=>{
 const w=workspace(),old=require('../legacy.js').seed('2026-10-17');old.settings.school='Restored College';const input=w.document.getElementById('restore-input');await input.listeners.change({target:{value:'backup.json',files:[{size:500,text:async()=>JSON.stringify(old)}]}});assert.equal(w.data().version,2);assert.equal(w.data().settings.school,'Restored College');const before=w.storage.raw;await input.listeners.change({target:{value:'bad.json',files:[{size:10,text:async()=>'{broken'}]}});assert.equal(w.storage.raw,before);assert.match(w.document.getElementById('toast').textContent,/valid JSON/);
});
test('all workflows gracefully render an empty school setup',()=>{
 const s=D.seed('2026-10-17');s.classes=[];s.lessons=[];s.assessments=[];s.plans=[];s.attendance=[];s.legacyAttendance=[];s.calendar={years:[],terms:[],holidays:[]};D.validateState(s);const w=workspace(s);for(const page of ['overview','classes','attendance','assessments','planner','timetable','settings']){w.page(page);assert.ok(w.html().includes('page-heading'));assert.ok(!w.html().includes('undefined'));}
});
