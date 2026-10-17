const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../core.js');
const L=require('../legacy.js');
const seeded=()=>D.seed('2026-10-17');
const lesson=s=>D.sessionsOn(s,'2026-10-19').find(l=>l.classId==='c1');
const holiday=(s,type,start='2026-10-19',end=start)=>s.calendar.holidays.push({id:D.uid('h'),name:'Test closure',type,start,end});
const special=(s,date='2026-10-19')=>s.specialDays.push({id:'special',date,label:'Event timetable',sessions:[{id:'sp1',classId:'c2',periodId:'p3',title:'',room:'Library'}]});

test('v1 upgrades preserve students, scores, pastoral notes and saved attendance',()=>{
 const old=L.seed('2026-10-17'),s=D.migrate(old,'2026-10-17');assert.equal(s.version,2);assert.deepEqual(s.students,old.students);assert.deepEqual(s.notes,old.notes);assert.deepEqual(s.assessments[0].marks,old.assessments[0].marks);assert.equal(s.attendance.length+s.legacyAttendance.length,old.attendance.length);assert.equal(old.version,1);assert.equal(old.lessons[0].periodId,undefined);
});
test('v1 ambiguous or Excused rolls are retained without inventing period marks',()=>{
 const old=L.seed('2026-10-17');old.attendance[0].rows.s1.status='Excused';const s=D.migrate(old,'2026-10-17');assert.equal(s.attendance.length,0);assert.equal(s.legacyAttendance[0].rows.s1.status,'Excused');assert.deepEqual(D.parseBackup(JSON.stringify(s)),s);
});
test('multiple v1 plans on one class/date survive migration without key collisions',()=>{
 const old=L.seed('2026-10-17');old.plans.push({...old.plans[0],id:'p2',title:'Second plan'});const s=D.migrate(old,'2026-10-17');assert.equal(s.plans.length,2);assert.equal(s.plans.filter(p=>p.periodId==='').length,1);assert.equal(s.plans[1].title,'Second plan');
});
test('school years and terms control teaching dates and calendar gaps',()=>{
 const s=seeded();assert.equal(D.dayInfo(s,'2026-10-19').closed,false);assert.equal(D.dayInfo(s,'2026-10-17').label,'Weekend');assert.equal(D.dayInfo(s,'2026-10-05').label,'School Holidays');assert.equal(D.dayInfo(s,'2026-12-21').label,'Outside school year');assert.equal(D.sessionsOn(s,'2026-10-05').length,0);
});
test('holiday date ranges are inclusive and public holidays take priority',()=>{
 const s=seeded();holiday(s,'School Holidays','2026-10-19','2026-10-21');holiday(s,'Public Holiday','2026-10-20');D.validateState(s);assert.equal(D.sessionsOn(s,'2026-10-19').length,0);assert.equal(D.sessionsOn(s,'2026-10-21').length,0);assert.equal(D.dayInfo(s,'2026-10-20').label,'Public Holiday');assert.ok(D.sessionsOn(s,'2026-10-22').length>0);
});
test('special timetable changes only its selected date and leaves recurrence untouched',()=>{
 const s=seeded(),before=D.clone(s.lessons);special(s);D.validateState(s);const changed=D.sessionsOn(s,'2026-10-19');assert.equal(changed.length,1);assert.equal(changed[0].classId,'c2');assert.equal(changed[0].periodName,'Period 3');assert.equal(changed[0].special,true);assert.equal(D.sessionsOn(s,'2026-10-26').length,4);assert.deepEqual(s.lessons,before);
});
test('holiday closures take precedence over a special timetable',()=>{
 const s=seeded();special(s);holiday(s,'Public Holiday');D.validateState(s);assert.equal(D.dayInfo(s,'2026-10-19').label,'Public Holiday');assert.deepEqual(D.sessionsOn(s,'2026-10-19'),[]);
});
test('empty special timetable cancels only that day; school events need no class roster',()=>{
 const s=seeded();special(s);s.specialDays[0].sessions=[];assert.equal(D.sessionsOn(s,'2026-10-19').length,0);assert.ok(D.sessionsOn(s,'2026-10-26').length);s.specialDays[0].sessions=[{id:'event',periodId:'p1',classId:'',title:'Sports carnival',room:'Oval'}];D.validateState(s);assert.equal(D.sessionsOn(s,'2026-10-19')[0].title,'Sports carnival');assert.equal(D.occurrences(s,'2026-10-19','2026-10-19').length,0);
});
test('term attendance columns use timetable periods and omit holiday lessons',()=>{
 const s=seeded(),term=D.termAt(s,'2026-10-19'),before=D.occurrences(s,term.start,term.end,'c1');assert.ok(before.length>0);assert.ok(before.every(l=>l.classId==='c1'&&l.periodId));holiday(s,'Public Holiday');const after=D.occurrences(s,term.start,term.end,'c1');assert.equal(after.filter(l=>l.date==='2026-10-19').length,0);assert.equal(before.length-after.length,1);
});
test('term/week labels follow calendar weeks without shifting on public holidays',()=>{
 const s=seeded(),term=D.termAt(s,'2026-10-19');assert.equal(D.termWeek(term,'2026-10-12'),1);assert.equal(D.termWeek(term,'2026-10-19'),2);assert.equal(D.termWeek(term,'2026-10-23'),2);
});
test('nine named periods remain ordered; breaks cannot be assigned classes',()=>{
 const s=seeded();assert.deepEqual(s.periods.map(p=>p.name),['Homeroom','Period 1','Period 2','Recess','Period 3','Period 4','Lunch','Period 5','Period 6']);s.lessons[0].periodId='recess';assert.throws(()=>D.validateState(s),/timetable/);s.lessons[0].periodId='homeroom';s.periods[1].start='08:50';assert.throws(()=>D.validateState(s),/overlaps/);
});
test('invalid and overlapping school dates and duplicate special dates are rejected',()=>{
 for(const change of [s=>s.calendar.terms[0].start='2026-01-01',s=>s.calendar.terms[1].start=s.calendar.terms[0].end,s=>s.calendar.years.push({...s.calendar.years[0],id:'new'}),s=>s.calendar.holidays.push({id:'h',name:'Invalid',type:'Public Holiday',start:'2026-02-30',end:'2026-03-02'}),s=>{special(s);s.specialDays.push({...s.specialDays[0],id:'other'});}]){const s=seeded();change(s);assert.throws(()=>D.validateState(s));}
});
test('every student-screen type overrides class marks and blocks both edits and shifts',()=>{
 for(const type of D.ABSENCE_TYPES){const s=seeded(),l=lesson(s);D.setAttendance(s,l,'s1','Present');s.absences.push({id:'absence',studentId:'s1',start:l.date,end:l.date,type,periodIds:[],comment:'Approved reason'});D.validateState(s);const value=D.attendanceValue(s,l,'s1');assert.equal(value.status,type);assert.equal(value.locked,true);assert.equal(value.comment,'Approved reason');assert.throws(()=>D.setAttendance(s,l,'s1','Absent'),/student screen/);assert.throws(()=>D.setAttendance(s,l,'s1','Late'),/student screen/);assert.equal(s.attendance.find(r=>r.id===l.key).rows.s1.status,'Present');}
});
test('student absence date and period ranges do not affect unrelated sessions',()=>{
 const s=seeded(),l=lesson(s);s.absences.push({id:'absence',studentId:'s1',start:'2026-10-19',end:'2026-10-20',type:'Medical',periodIds:['p1'],comment:''});assert.equal(D.attendanceValue(s,l,'s1').locked,true);assert.equal(D.absenceFor(s,'s1','2026-10-20','p1').type,'Medical');assert.equal(D.absenceFor(s,'s1','2026-10-20','p2'),undefined);assert.equal(D.absenceFor(s,'s1','2026-10-21','p1'),undefined);assert.equal(D.absenceFor(s,'s2','2026-10-20','p1'),undefined);
});
test('overlapping student absence records are rejected, distinct periods are allowed',()=>{
 const s=seeded(),a={id:'a',studentId:'s1',start:'2026-10-19',end:'2026-10-20',type:'Medical',periodIds:['p1'],comment:''};s.absences.push(a,{...a,id:'b',periodIds:['p2']});D.validateState(s);s.absences[1].periodIds=[];assert.throws(()=>D.validateState(s),/overlap/);
});
test('click sequence, Shift-click and clearing are distinct and saved zeros are unrelated',()=>{
 assert.equal(D.cycleAttendance(''),'Present');assert.equal(D.cycleAttendance('Present'),'Absent');assert.equal(D.cycleAttendance('Absent'),'Present');for(const value of ['','Present','Absent','Late'])assert.equal(D.cycleAttendance(value,true),'Late');const s=seeded(),l=lesson(s);D.setAttendance(s,l,'s1','Late');assert.equal(D.attendanceValue(s,l,'s1').status,'Late');D.setAttendance(s,l,'s1','');assert.equal(D.attendanceValue(s,l,'s1').status,'');
});
test('a holiday or timetable change prevents saving a stale class attendance cell',()=>{
 const s=seeded(),l=lesson(s);holiday(s,'Public Holiday');assert.throws(()=>D.setAttendance(s,l,'s1','Present'),/no longer/);assert.equal(s.attendance.some(r=>r.id===l.key),false);
});
test('marking absent/late never changes another period or class on the same date',()=>{
 const s=seeded(),l=lesson(s);s.lessons.push({id:'extra',classId:'c1',day:1,periodId:'p3',room:'H2'});const second=D.sessionsOn(s,l.date).find(x=>x.classId==='c1'&&x.periodId==='p3');D.setAttendance(s,l,'s1','Absent');assert.equal(D.attendanceValue(s,second,'s1').status,'');D.setAttendance(s,second,'s1','Late');assert.equal(D.attendanceValue(s,l,'s1').status,'Absent');
});
test('full-year marksbook includes earlier and later tasks but excludes other years/classes',()=>{
 const s=seeded();s.assessments.push({id:'early',classId:'c1',yearId:'y2026',title:'Earlier task',due:'2026-03-02',max:100,description:'',marks:{s1:50}},{id:'later',classId:'c1',yearId:'y2027',title:'Next year',due:'2027-03-02',max:100,description:'',marks:{s1:100}});const list=D.yearAssessments(s,'c1','y2026');assert.equal(list.length,2);assert.equal(list[0].id,'early');assert.ok(!list.some(a=>a.id==='later'||a.classId!=='c1'));
});
test('overall uses points from marked tasks, includes zero and excludes blank tasks',()=>{
 const s=seeded();s.assessments=[{id:'a',classId:'c1',yearId:'y2026',title:'One',due:'2026-10-19',max:20,description:'',marks:{s1:15}},{id:'b',classId:'c1',yearId:'y2026',title:'Two',due:'2026-10-20',max:80,description:'',marks:{}},{id:'c',classId:'c1',yearId:'y2026',title:'Three',due:'2026-10-21',max:100,description:'',marks:{s1:0}}];const total=D.overall(s,'s1','c1','y2026');assert.equal(total.earned,15);assert.equal(total.possible,120);assert.equal(total.percent,12.5);assert.equal(total.grade,'F');assert.equal(total.count,2);assert.equal(D.overall(s,'s2','c1','y2026').percent,null);const draft={b:{s1:'80'},c:{s1:''}};assert.equal(D.overall(s,'s1','c1','y2026',draft).percent,95);
});
test('grades follow the user thresholds without prematurely rounding a boundary',()=>{
 for(const [percent,grade]of [[100,'A'],[75,'A'],[74.999,'B'],[65,'B'],[64.999,'C'],[50,'C'],[49.999,'D'],[35,'D'],[34.999,'E'],[15,'E'],[14.999,'F'],[0,'F']])assert.equal(D.grade(percent),grade);
});
test('plans use date/class/period keys; saved plans survive timetable changes',()=>{
 const s=seeded(),p=s.plans[0],old=D.planKey(p.date,p.classId,p.periodId);s.lessons=s.lessons.filter(l=>l.classId!==p.classId);D.validateState(s);assert.equal(s.plans[0].title,p.title);assert.ok(!D.occurrences(s,p.date,p.date).some(l=>l.key===old));s.plans.push({...p,id:'duplicate'});assert.throws(()=>D.validateState(s),/already has a saved plan/);
});
test('period time edits flow through every dated timetable session',()=>{
 const s=seeded();s.periods[1].start='09:05';s.periods[1].end='09:45';D.validateState(s);const l=lesson(s);assert.equal(l.start,'09:05');assert.equal(l.end,'09:45');assert.equal(D.sessionsOn(s,'2026-10-26').find(l=>l.classId==='c1').start,'09:05');
});
test('version 1 storage upgrades in memory and persists version 2 on the next save',()=>{
 const old=L.seed('2026-10-17'),storage={raw:JSON.stringify(old),getItem(){return this.raw},setItem(_key,v){this.raw=v}},store=new D.Store(storage);assert.equal(store.data.version,2);assert.equal(JSON.parse(storage.raw).version,1);store.commit(s=>s.settings.theme='ocean');assert.equal(JSON.parse(storage.raw).version,2);assert.equal(new D.Store(storage).data.settings.theme,'ocean');
});
