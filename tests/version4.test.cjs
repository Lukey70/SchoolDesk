const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../core.js'),V2=require('../core-v2.js');
const seed=()=>D.seed('2026-10-17');
const legacyV3=()=>{const s=seed();s.version=3;delete s.settings.attendanceRules.Excused;s.students[0].homegroup='9 Previous';s.students[0].year='6';return s;};
const excused=(s,extra={})=>s.absences.push({id:'excused',studentId:'s1',type:'Excused',start:'2026-10-19',end:'2026-10-19',periodIds:['p1'],comment:'Approved absence',...extra});

test('homegroup names and colours exactly match the approved school choices',()=>{
 assert.deepEqual(D.HOMEGROUPS.map(g=>[g.name,g.colour]),[['Jarrah','Green'],['Tuart','Blue'],['Wattle','Yellow'],['Redgum','Red']]);assert.equal(new Set(D.HOMEGROUPS.map(g=>g.hex)).size,4);assert.deepEqual(D.YEAR_LEVELS,['7','8','9','10','11','12']);
});
test('new student choices validate all six year levels and four homegroups',()=>{
 for(const year of D.YEAR_LEVELS)for(const group of D.HOMEGROUPS){const s=seed(),added=D.addStudents(s,[{firstName:'New',lastName:'Learner',year,homegroup:group.name}],'2026-10-19');assert.equal(added[0].homegroup,group.name);assert.equal(added[0].year,year);D.validateState(s);}
});
test('invalid years and homegroups reject the entire new-student batch',()=>{
 for(const change of [{year:'6'},{year:'13'},{year:''},{homegroup:'Banksia'},{homegroup:'9 Jarrah'},{homegroup:''}]){const s=seed(),before=JSON.stringify(s),good={firstName:'One',lastName:'Student',year:'9',homegroup:'Jarrah'};assert.throws(()=>D.addStudents(s,[good,{...good,...change}],'2026-10-19'),/Row 2/);assert.equal(JSON.stringify(s),before);}
});
test('CSV choices accept labelled year levels and case-insensitive approved homegroups',()=>{
 const s=seed(),rows=D.studentImport('First name,Last name,Year level,Homegroup\nAlex,Smith,Year 7,jarrah\nSam,Jones,Year 12, REDGUM');D.addStudents(s,rows,'2026-10-19');assert.equal(s.students.at(-2).homegroup,'Jarrah');assert.equal(s.students.at(-2).year,'7');assert.equal(s.students.at(-1).homegroup,'Redgum');assert.equal(s.students.at(-1).year,'12');
});
test('v3 upgrade preserves original fields and records while adding the Excused rule',()=>{
 const old=legacyV3(),before=JSON.stringify(old),next=D.migrate(old,'2026-10-18');assert.equal(next.version,4);assert.equal(next.settings.attendanceRules.Excused,'Absent');for(const key of ['students','classes','attendance','legacyAttendance','absences','assessments','notes','plans','timetableVersions','auditLog'])assert.deepEqual(next[key],old[key],key);assert.equal(JSON.stringify(old),before);assert.equal(next.students[0].year,'6');assert.equal(next.students[0].homegroup,'9 Previous');assert.deepEqual(D.parseBackup(JSON.stringify(next)),next);
});
test('v3 storage upgrade is read-only until a successful save and reopens as v4',()=>{
 const old=legacyV3(),storage={raw:JSON.stringify(old),getItem(){return this.raw},setItem(k,v){this.raw=v}},raw=storage.raw,store=new D.Store(storage);assert.equal(store.blocked,false);assert.equal(storage.raw,raw);assert.equal(store.data.version,4);store.commit(s=>s.settings.theme='ocean');assert.equal(JSON.parse(storage.raw).version,4);assert.equal(new D.Store(storage).data.students[0].homegroup,'9 Previous');
});
test('version 1/2 migrations retain legacy group values without silently reassigning students',()=>{
 for(const previous of [require('../legacy.js').seed('2026-10-17'),V2.seed('2026-10-17')]){const next=D.migrate(previous,'2026-10-18');assert.equal(next.settings.attendanceRules.Excused,'Absent');assert.deepEqual(next.students.map(s=>s.homegroup),previous.students.map(s=>s.homegroup));}
});
test('malformed v3 data remains blocked and original bytes survive failed saves',()=>{
 const old=legacyV3();old.students[0].schoolEnrolments=[{start:'2026-02-30',end:''}];const storage={raw:JSON.stringify(old),getItem(){return this.raw},setItem(k,v){this.raw=v}},raw=storage.raw,store=new D.Store(storage);assert.equal(store.blocked,true);assert.equal(storage.raw,raw);assert.throws(()=>store.commit(s=>s.settings.school='Bad overwrite'),/restore/);assert.equal(storage.raw,raw);
});
test('class archives on the first day after its selected year end without rewriting history',()=>{
 const s=seed(),c=s.classes[0],before=JSON.stringify(s),year=s.calendar.years.find(y=>y.id===c.yearId);assert.equal(D.classArchived(s,c,year.end),false);assert.equal(D.classArchived(s,c,D.shiftDate(year.end,1)),true);assert.equal(D.classArchiveInfo(s,c,'2027-01-01').firstDay,'2026-12-19');assert.equal(D.classArchiveInfo(s,c,'2027-01-01').automatic,true);assert.equal(JSON.stringify(s),before);assert.ok(D.sessionsOn(s,'2026-10-19').some(l=>l.classId===c.id));assert.ok(D.yearRoster(s,c.id,'y2026').some(x=>x.id==='s1'));assert.equal(s.assessments[0].marks.s1,26);
});
test('future-year classes stay active and legacy unlinked classes retain earlier behaviour',()=>{
 const s=seed(),c=s.classes[0];c.yearId='y2027';assert.equal(D.classArchived(s,c,'2026-12-19'),false);assert.equal(D.classAvailable(s,c,'2026-12-19'),false);assert.equal(D.classArchived(s,c,'2027-12-19'),true);c.yearId='';assert.equal(D.classArchived(s,c,'2027-12-19'),false);
});
test('calendar year-end edits immediately update automatic archive status',()=>{
 const s=seed(),c=s.classes[0],year=s.calendar.years.find(y=>y.id===c.yearId);assert.equal(D.classArchived(s,c,'2026-12-19'),true);year.end='2026-12-20';assert.equal(D.classArchived(s,c,'2026-12-19'),false);assert.equal(D.classArchived(s,c,'2026-12-21'),true);D.validateState(s);
});
test('a manual restore cannot override the ended school year',()=>{
 const s=seed();D.archiveClass(s,'c1','2026-11-01');const before=JSON.stringify(s);assert.throws(()=>D.restoreClass(s,'c1','2026-12-19'),/school year has ended/);assert.equal(JSON.stringify(s),before);D.restoreClass(s,'c1','2026-11-02');assert.equal(D.classArchived(s,'c1','2026-11-02'),false);assert.equal(D.classArchived(s,'c1','2026-12-19'),true);
});
test('Excused is a protected student-screen override and never an editable class mark',()=>{
 const s=seed(),l=D.sessionsOn(s,'2026-10-19').find(l=>l.classId==='c1');D.setAttendance(s,l,'s1','Present');excused(s);D.validateState(s);const before=JSON.stringify(s.absences);assert.equal(D.attendanceValue(s,l,'s1').status,'Excused');assert.equal(D.attendanceValue(s,l,'s1').locked,true);for(const status of ['Present','Absent','Late',''])assert.throws(()=>D.setAttendance(s,l,'s1',status),/student screen/);assert.equal(JSON.stringify(s.absences),before);assert.equal(s.attendance.find(r=>r.id===l.key).rows.s1.status,'Present');
});
test('Excused accepts all-day or period/date coverage and obeys enrolment boundaries',()=>{
 const s=seed();excused(s,{end:'2026-10-26',periodIds:[]});D.archiveStudent(s,'s1','2026-10-21');D.validateState(s);const entries=D.attendanceEntries(s,{start:'2026-10-19',end:'2026-10-26',studentId:'s1'});assert.ok(entries.length);assert.ok(entries.every(e=>e.status==='Excused'&&e.date<'2026-10-21'));assert.equal(D.attendanceEntries(s,{start:'2026-10-21',end:'2026-10-26',studentId:'s1'}).length,0);
});
test('Excused resolves once in summaries and obeys the configurable counting rule',()=>{
 const s=seed(),f={start:'2026-10-19',end:'2026-10-19',studentId:'s1'},l=D.sessionsOn(s,f.start).find(l=>l.classId==='c1');D.setAttendance(s,l,'s1','Present');excused(s);assert.equal(D.attendanceEntries(s,f).length,1);assert.equal(D.attendanceSummary(s,'s1',f).Excused,1);assert.equal(D.attendanceSummary(s,'s1',f).rate,0);s.settings.attendanceRules.Excused='Exclude';assert.equal(D.attendanceSummary(s,'s1',f).rate,null);assert.equal(D.attendanceSummary(s,'s1',f).excluded,1);s.settings.attendanceRules.Excused='Attended';assert.equal(D.attendanceSummary(s,'s1',f).rate,100);
});
test('Excused survives save, backup, undo/redo and overlapping absence checks',()=>{
 const storage={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}},store=new D.Store(storage);store.commit(s=>excused(s));assert.equal(new D.Store(storage).data.absences[0].type,'Excused');assert.equal(D.parseBackup(JSON.stringify(store.data)).absences[0].type,'Excused');store.undo();assert.equal(store.data.absences.length,0);store.redo();assert.equal(store.data.absences[0].type,'Excused');const before=JSON.stringify(store.data);assert.throws(()=>store.commit(s=>excused(s,{id:'overlap',type:'Medical'})),/overlap/);assert.equal(JSON.stringify(store.data),before);
});
