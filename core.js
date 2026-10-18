/* SchoolDesk v4 domain: dated enrolments, stable history and shared calculations. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./core-v2.js'):root.SchoolDeskV2);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SchoolDesk=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(B){
'use strict';
const {clone,uid,isoDate,dateValid,shiftDate}=B,VERSION=4,STORAGE_KEY=B.STORAGE_KEY;
const PALETTE={sage:'#dcebd3',peach:'#f6dfcc',lavender:'#e5dcf5',blue:'#d8e9f7'};
const shades=['#f8d9db','#efc0c8','#e4abb9','#f7d3e7','#e8c3e9','#d7c4ef','#c9c8f1','#c4d5f6','#c2e0f4','#bde7ed','#bde7df','#c9e6d4','#d7e9be','#e5ecb9','#f1ebbb','#fae6b9','#f8d4b2','#efc6b3','#e1c5b6','#d8ccbd','#d1dfc6','#bbd6bd','#b6d2ca','#b8cedb','#bdc4da','#cec2d5','#ddc5d0','#ead3c7','#ede0cb','#dce3e7','#b9dfe0','#cbdce8','#d4d9ee','#e5d6e4','#e7dfc3','#c7ddba'];
shades.forEach((value,i)=>PALETTE['colour'+(i+1)]=value);
const YEAR_LEVELS=Object.freeze(['7','8','9','10','11','12']);
const HOMEGROUPS=Object.freeze([
  Object.freeze({name:'Jarrah',colour:'Green',hex:'#287347',background:'#e2f0e7'}),
  Object.freeze({name:'Tuart',colour:'Blue',hex:'#245da8',background:'#e4edf9'}),
  Object.freeze({name:'Wattle',colour:'Yellow',hex:'#e5b700',background:'#fff4bf'}),
  Object.freeze({name:'Redgum',colour:'Red',hex:'#b33139',background:'#f9e3e5'})
]);
const ABSENCE_TYPES=Object.freeze([...B.ABSENCE_TYPES,'Excused']);
const normalizeYear=value=>String(value??'').trim().replace(/^year\s*/i,'');
const normalizeHomegroup=value=>HOMEGROUPS.find(g=>g.name.toLowerCase()===String(value??'').trim().toLowerCase())?.name||String(value??'').trim();
function validateYearLevel(value){const year=normalizeYear(value);if(!YEAR_LEVELS.includes(year))throw new Error('Choose a year level from Year 7 to Year 12.');return year;}
function studentChoices(row){const year=validateYearLevel(row.year),homegroup=normalizeHomegroup(row.homegroup);if(!HOMEGROUPS.some(g=>g.name===homegroup))throw new Error('Choose Jarrah, Tuart, Wattle or Redgum as the homegroup.');return {year,homegroup};}
const ASSESSMENT_STATUSES=['Scored','Not marked','Not submitted','Exempt'];
const contains=(range,date)=>date>=range.start&&(!range.end||date<range.end);
const intersects=(a,b)=>a.start<(b.end||'9999-12-31')&&b.start<(a.end||'9999-12-31');
const displayName=s=>s?`${s.firstName}${s.preferredName?' ('+s.preferredName+')':''} ${s.lastName}`:'Unknown student';
const studentEnrolled=(student,date=isoDate())=>Boolean(student?.schoolEnrolments?.some(r=>contains(r,date)));
function classArchiveInfo(s,c,date=isoDate()){
  if(typeof c==='string')c=s.classes.find(x=>x.id===c);if(!c)return {archived:false,automatic:false};
  const year=s.calendar.years.find(y=>y.id===c.yearId),automatic=Boolean(year&&date>year.end),manual=c.archivePeriods.some(r=>contains(r,date));
  return {archived:automatic||manual,automatic,year,firstDay:automatic?shiftDate(year.end,1):c.archivePeriods.find(r=>contains(r,date))?.start||''};
}
const classArchived=(s,c,date=isoDate())=>classArchiveInfo(s,c,date).archived;
function classAvailable(s,c,date=isoDate()){
  if(typeof c==='string')c=s.classes.find(x=>x.id===c);if(!c)return false;
  const info=classArchiveInfo(s,c,date),year=info.year;
  return (!c.yearId||(year&&date>=year.start&&date<=year.end))&&!info.archived;
}
function classEnrolled(s,classId,studentId,date){
  const c=s.classes.find(c=>c.id===classId),student=s.students.find(x=>x.id===studentId);
  return classAvailable(s,c,date)&&studentEnrolled(student,date)&&c.enrolments.some(r=>r.studentId===studentId&&contains(r,date));
}
function classRoster(s,classId,date=isoDate()){
  return s.students.filter(x=>classEnrolled(s,classId,x.id,date)).sort((a,b)=>a.lastName.localeCompare(b.lastName)||a.firstName.localeCompare(b.firstName));
}
function yearRoster(s,classId,yearId){
  const c=s.classes.find(c=>c.id===classId),year=s.calendar.years.find(y=>y.id===yearId);if(!c||!year)return [];
  const span={start:year.start,end:shiftDate(year.end,1)},ids=new Set(c.enrolments.filter(r=>intersects(r,span)).map(r=>r.studentId));
  for(const a of B.yearAssessments(s,classId,yearId))for(const id of [...Object.keys(a.marks),...Object.keys(a.statuses)])ids.add(id);
  return [...ids].map(id=>s.students.find(x=>x.id===id)).filter(Boolean).sort((a,b)=>a.lastName.localeCompare(b.lastName));
}
function recurringOn(s,date){
  const version=[...s.timetableVersions].filter(v=>v.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return clone(version?.lessons||[]);
}
function sessionsOn(s,date){
  const info=B.dayInfo(s,date);if(info.closed)return [];
  const rows=info.special?info.special.sessions:recurringOn(s,date).filter(l=>l.day===new Date(date+'T12:00:00').getDay());
  return rows.filter(l=>!l.classId||classAvailable(s,l.classId,date)).map(l=>{const p=B.periodAt(s,l.periodId);return {...l,date,start:p.start,end:p.end,periodName:p.name,key:B.sessionKey(date,l.classId,l.periodId),special:Boolean(info.special)};}).sort((a,b)=>a.start.localeCompare(b.start));
}
function occurrences(s,start,end,classId=''){
  if(!dateValid(start)||!dateValid(end)||end<start)return [];
  const out=[];let date=start,n=0;while(date<=end&&n++<740){for(const l of sessionsOn(s,date))if(l.classId&&(!classId||l.classId===classId))out.push(l);date=shiftDate(date,1);}return out;
}
function nextTeachingDay(s,date){let d=date;for(let i=0;i<370;i++,d=shiftDate(d,1))if(sessionsOn(s,d).length)return d;return date;}
function reviseTimetable(s,date,change){
  if(!dateValid(date))throw new Error('Choose a valid effective date.');
  const lessons=recurringOn(s,date);change(lessons);
  const old=s.timetableVersions.find(v=>v.effectiveFrom===date);
  const version={id:old?.id||uid('timetable'),effectiveFrom:date,lessons};
  s.timetableVersions=s.timetableVersions.filter(v=>v.effectiveFrom!==date);s.timetableVersions.push(version);s.timetableVersions.sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
  s.lessons=recurringOn(s,isoDate());
}
function closeRanges(ranges,date){return ranges.filter(r=>r.start<date).map(r=>({...r,end:!r.end||r.end>date?date:r.end}));}
function archiveStudent(s,id,date){
  if(!dateValid(date))throw new Error('Choose the first day the student is no longer enrolled.');
  const x=s.students.find(x=>x.id===id);x.schoolEnrolments=closeRanges(x.schoolEnrolments,date);x.active=studentEnrolled(x);
  for(const c of s.classes)c.enrolments=c.enrolments.flatMap(r=>r.studentId!==id?[r]:closeRanges([r],date));
}
function restoreStudent(s,id,date){
  if(!dateValid(date))throw new Error('Choose a valid re-enrolment date.');
  const x=s.students.find(x=>x.id===id);if(studentEnrolled(x,date))throw new Error('Student is already enrolled on that date.');x.schoolEnrolments.push({start:date,end:''});x.active=studentEnrolled(x);
}
function archiveClass(s,id,date){const c=s.classes.find(c=>c.id===id);if(!dateValid(date))throw new Error('Choose a valid archive date.');if(c.archivePeriods.some(r=>contains(r,date)))throw new Error('Class is already archived on that date.');c.archivePeriods.push({start:date,end:''});}
function restoreClass(s,id,date){const c=s.classes.find(c=>c.id===id);if(!dateValid(date))throw new Error('Choose a valid restoration date.');if(classArchiveInfo(s,c,date).automatic)throw new Error('This class school year has ended. Edit its school year before restoring it.');const range=c.archivePeriods.find(r=>contains(r,date));if(!range)throw new Error('Class is not archived on this date.');if(date===range.start)c.archivePeriods=c.archivePeriods.filter(r=>r!==range);else range.end=date;}
function allocateStudentNumber(s){let next=s.settings.nextStudentNumber||1,code;do{code='SD'+String(next++).padStart(6,'0');}while(s.students.some(x=>x.code.toLowerCase()===code.toLowerCase()));s.settings.nextStudentNumber=next;return code;}
function addStudents(s,rows,start=isoDate()){
  if(!dateValid(start))throw new Error('Choose a valid school enrolment date.');if(!rows.length||rows.length>500)throw new Error('Add between 1 and 500 students at a time.');
  for(const [i,row]of rows.entries()){if(!row.firstName?.trim()||!row.lastName?.trim())throw new Error('Row '+(i+1)+': first name and last name are required.');try{studentChoices(row);}catch(error){throw new Error('Row '+(i+1)+': '+error.message);}}
  const added=[];for(const row of rows){const x={id:uid('s'),code:allocateStudentNumber(s),firstName:row.firstName.trim(),lastName:row.lastName.trim(),preferredName:(row.preferredName||'').trim(),...studentChoices(row),guardian:row.guardian||'',email:row.email||'',phone:row.phone||'',support:row.support||'',active:true,schoolEnrolments:[{start,end:''}]};s.students.push(x);added.push(x);}return added;
}
function attendanceValue(s,session,studentId,drafts={}){
  if(!classEnrolled(s,session.classId,studentId,session.date))return {status:'Not enrolled',locked:true,notEnrolled:true,comment:''};
  return B.attendanceValue(s,session,studentId,drafts);
}
function setAttendance(s,session,id,status){
  if(!classEnrolled(s,session.classId,id,session.date))throw new Error('The student is not enrolled in this class on that date.');
  if(!sessionsOn(s,session.date).some(x=>x.key===session.key))throw new Error('This lesson is no longer timetabled.');
  if(B.absenceFor(s,id,session.date,session.periodId))throw new Error('Change this attendance type from the student screen.');
  if(!B.STATUSES.includes(status)&&status!=='')throw new Error('Choose a valid attendance status.');
  let r=s.attendance.find(r=>r.id===session.key);if(!r){r={id:session.key,date:session.date,classId:session.classId,periodId:session.periodId,rows:{},savedAt:new Date().toISOString()};s.attendance.push(r);}
  if(status)r.rows[id]={status,comment:r.rows[id]?.comment||''};else delete r.rows[id];r.savedAt=new Date().toISOString();
}
function attendanceEntries(s,filter={}){
  const entries=new Map(),end=filter.end||isoDate(),start=filter.start||s.calendar.years.reduce((d,y)=>y.start<d?y.start:d,end);
  const accept=(date,classId,id)=>date>=start&&date<=end&&(!filter.classId||classId===filter.classId)&&(!filter.studentId||id===filter.studentId)&&classEnrolled(s,classId,id,date);
  for(const r of [...s.legacyAttendance,...s.attendance])for(const [id,row]of Object.entries(r.rows)){
    if(!accept(r.date,r.classId,id))continue;
    const value=r.periodId?attendanceValue(s,{...r,key:r.id},id):row;
    if(value.status&&value.status!=='Not enrolled')entries.set(r.id+'|'+id,{date:r.date,classId:r.classId,periodId:r.periodId||'',session:r.session||'',studentId:id,...value});
  }
  for(const a of s.absences){if(filter.studentId&&filter.studentId!==a.studentId)continue;const from=a.start>start?a.start:start,to=a.end<end?a.end:end;for(const l of occurrences(s,from,to,filter.classId||'')){
    if(!accept(l.date,l.classId,a.studentId))continue;const value=attendanceValue(s,l,a.studentId);if(value.locked&&!value.notEnrolled)entries.set(l.key+'|'+a.studentId,{date:l.date,classId:l.classId,periodId:l.periodId,studentId:a.studentId,...value});
  }}return [...entries.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.studentId.localeCompare(b.studentId));
}
function attendanceSummary(s,studentId=null,filter={}){
  const counts={Present:0,Absent:0,Late:0,total:0,attended:0,excluded:0};
  for(const e of attendanceEntries(s,{...filter,studentId:studentId||filter.studentId})){counts[e.status]=(counts[e.status]||0)+1;const rule=s.settings.attendanceRules[e.status]||'Absent';if(rule==='Exclude'){counts.excluded++;continue;}counts.total++;if(rule==='Attended')counts.attended++;}
  counts.rate=counts.total?Math.round(counts.attended/counts.total*100):null;return counts;
}
function assessmentStatus(a,id,marks=a.marks,statuses=a.statuses){return statuses[id]||(marks[id]!==undefined&&marks[id]!==''&&marks[id]!==null?'Scored':'Not marked');}
function assessedValue(a,id,marks=a.marks,statuses=a.statuses){
  const status=assessmentStatus(a,id,marks,statuses);if(status==='Exempt'||status==='Not marked')return null;if(status==='Not submitted')return 0;
  const raw=marks[id];if(raw===''||raw===null||raw===undefined)return null;const n=Number(raw);return Number.isFinite(n)&&n>=0&&n<=a.max?n:NaN;
}
function overall(s,id,classId,yearId,drafts={},statusDrafts={}){
  let earned=0,possible=0,count=0,weighted=0,weightTotal=0;const mode=s.gradingModes[classId+'|'+yearId]||'points';
  for(const a of B.yearAssessments(s,classId,yearId)){const n=assessedValue(a,id,drafts[a.id]||a.marks,statusDrafts[a.id]||a.statuses);if(n===null)continue;if(!Number.isFinite(n))return {percent:null,grade:'—',count,invalid:true};if(mode==='weighted'&&a.weight<=0)continue;earned+=n;possible+=a.max;weighted+=n/a.max*a.weight;weightTotal+=a.weight;count++;}
  const percent=mode==='weighted'?(weightTotal?weighted/weightTotal*100:null):(possible?earned/possible*100:null);
  return {percent,grade:percent===null?'—':B.grade(percent),earned,possible,count,mode};
}
function assessmentAverage(s,a,marks=a.marks,statuses=a.statuses){
  const ids=yearRoster(s,a.classId,a.yearId).map(x=>x.id);let sum=0,count=0;for(const id of ids){const n=assessedValue(a,id,marks,statuses);if(n===null)continue;if(!Number.isFinite(n))return {percent:null,count,invalid:true};sum+=n/a.max*100;count++;}return {percent:count?sum/count:null,count};
}
function parseDelimited(text,delimiter,keepBlank=false){
  text=String(text).replace(/^\uFEFF/,'');delimiter=delimiter||(text.split(/\r?\n/,1)[0].includes('\t')?'\t':',');
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell!=='')throw new Error('Unexpected quote in pasted data.');else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(keepBlank||row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('A quoted CSV field was not closed.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function studentImport(text){
  const rows=parseDelimited(text);if(!rows.length)return [];
  const normalize=x=>x.toLowerCase().replace(/[^a-z]/g,''),aliases={firstname:'firstName',lastname:'lastName',preferredname:'preferredName',year:'year',yearlevel:'year',homegroup:'homegroup'};
  const header=rows[0].map(x=>aliases[normalize(x)]),hasHeader=header.includes('firstName')&&header.includes('lastName');
  const fields=hasHeader?header:['firstName','lastName','year','homegroup','preferredName'];
  return (hasHeader?rows.slice(1):rows).map(r=>Object.fromEntries(fields.filter(Boolean).map(key=>[key,r[fields.indexOf(key)]?.trim()||''])));
}
function changesBetween(before,after){
  const changes=[];const describe=x=>{const value=typeof x==='string'?x:JSON.stringify(x);return String(value??'').slice(0,240);};
  function visit(a,b,path){if(changes.length>=100||JSON.stringify(a)===JSON.stringify(b))return;
    if(Array.isArray(a)&&Array.isArray(b)&&[...a,...b].every(x=>x&&typeof x==='object'&&x.id)){const ids=new Set([...a,...b].map(x=>x.id));for(const id of ids)visit(a.find(x=>x.id===id),b.find(x=>x.id===id),path+'.'+id);}
    else if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))if(key!=='auditLog')visit(a[key],b[key],path?path+'.'+key:key);}
    else changes.push({path,before:describe(a),after:describe(b)});
  }visit(before,after,'');return changes;
}
function migrate(input,reference=isoDate()){
  if(input?.version===4)return clone(validateState(input));
  if(input?.version===3){const s=clone(input);s.version=4;if(s.settings?.attendanceRules&&!Object.hasOwn(s.settings.attendanceRules,'Excused'))s.settings.attendanceRules.Excused='Absent';return validateState(s);}
  const old=B.migrate(input,reference),s=clone(old);s.version=4;
  const start=s.calendar.years.reduce((d,y)=>y.start<d?y.start:d,reference);
  s.settings.nextStudentNumber=1;s.settings.attendanceRules=Object.fromEntries([...B.STATUSES,...ABSENCE_TYPES].map(x=>[x,['Present','Late'].includes(x)?'Attended':'Absent']));
  for(const x of s.students){x.preferredName='';x.schoolEnrolments=[{start,end:x.active?'':reference}].filter(r=>!r.end||r.start<r.end);}
  for(const c of s.classes){c.yearId='';c.archivePeriods=[];c.enrolments=c.studentIds.map(studentId=>({studentId,start,end:''}));}
  s.timetableVersions=[{id:'initial_timetable',effectiveFrom:'1900-01-01',lessons:clone(s.lessons)}];
  for(const a of s.assessments){a.statuses={};a.weight=0;}s.gradingModes={};s.auditLog=[];return validateState(s);
}
function seed(date=isoDate()){const s=migrate(B.seed(date),date);for(const [i,x]of s.students.entries())x.homegroup=HOMEGROUPS[i%HOMEGROUPS.length].name;for(const c of s.classes)c.yearId=B.yearAt(s,date)?.id||s.calendar.years[0]?.id||'';return validateState(s);}
function validateState(s){
  const fail=m=>{throw new Error('Invalid workspace: '+m);},obj=x=>x&&typeof x==='object'&&!Array.isArray(x),str=(x,n=10000)=>typeof x==='string'&&x.length<=n;
  if(!s||s.version!==4)fail('unsupported version.');
  const base=clone(s);base.version=2;for(const c of base.classes)c.colour='sage';
  // The v2 validator supplies structural/range checks; map only the newly supported
  // type on its temporary copy. The saved Excused records remain unchanged.
  if(Array.isArray(base.absences))for(const a of base.absences)if(a.type==='Excused')a.type='Medical';B.validateState(base);
  const ranges=(rows,name)=>{if(!Array.isArray(rows)||rows.length>500)fail(name+' must be a supported list.');for(const r of rows)if(!dateValid(r.start)||!(r.end===''||(dateValid(r.end)&&r.end>r.start)))fail(name+': end must be the first day no longer enrolled, after the start date.');for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(intersects(rows[i],rows[j]))fail(name+' dates overlap.');};
  if(!Number.isSafeInteger(s.settings.nextStudentNumber)||s.settings.nextStudentNumber<1||!obj(s.settings.attendanceRules))fail('invalid numbering or attendance settings.');
  for(const status of [...B.STATUSES,...ABSENCE_TYPES])if(!['Attended','Absent','Exclude'].includes(s.settings.attendanceRules[status]))fail('invalid attendance counting rule.');
  for(const x of s.students){if(!str(x.preferredName,100))fail('invalid preferred name.');ranges(x.schoolEnrolments,'school enrolment');}
  for(const c of s.classes){if(!Object.hasOwn(PALETTE,c.colour)||!(c.yearId===''||s.calendar.years.some(y=>y.id===c.yearId)))fail('invalid class colour or school year.');ranges(c.archivePeriods,'class archive');if(!Array.isArray(c.enrolments)||c.enrolments.length>20000)fail('invalid class enrolments.');const grouped=new Map();for(const e of c.enrolments){if(!s.students.some(x=>x.id===e.studentId))fail('unknown enrolled student.');const rows=grouped.get(e.studentId)||[];rows.push(e);grouped.set(e.studentId,rows);}for(const rows of grouped.values())ranges(rows,'class enrolment');}
  if(!Array.isArray(s.timetableVersions)||!s.timetableVersions.length||s.timetableVersions.length>1000||new Set(s.timetableVersions.map(x=>x.effectiveFrom)).size!==s.timetableVersions.length)fail('invalid timetable history.');
  for(const v of s.timetableVersions){if(!dateValid(v.effectiveFrom)||typeof v.id!=='string'||!Array.isArray(v.lessons)||v.lessons.length>35)fail('invalid timetable version.');const check={...base,lessons:clone(v.lessons)};B.validateState(check);}
  if(!obj(s.gradingModes))fail('invalid grading settings.');for(const [key,mode]of Object.entries(s.gradingModes)){if(!['points','weighted'].includes(mode))fail('unknown grading mode.');if(mode==='weighted'){const [classId,yearId]=key.split('|'),sum=B.yearAssessments(s,classId,yearId).reduce((n,a)=>n+a.weight,0);if(Math.abs(sum-100)>.001)fail('assessment weights must total 100% in weighted mode.');}}
  for(const a of s.assessments){if(!obj(a.statuses)||!Number.isFinite(a.weight)||a.weight<0||a.weight>100)fail('invalid assessment weight or status.');for(const[id,status]of Object.entries(a.statuses))if(!s.students.some(x=>x.id===id)||!ASSESSMENT_STATUSES.includes(status))fail('invalid assessment status.');}
  if(!Array.isArray(s.auditLog)||s.auditLog.length>200)fail('invalid change history.');for(const e of s.auditLog)if(!str(e.id,100)||!str(e.at,100)||!str(e.actor,200)||!str(e.summary,500)||!Array.isArray(e.changes)||e.changes.length>100||e.changes.some(c=>!str(c.path,500)||!str(c.before,240)||!str(c.after,240)))fail('invalid change-history record.');
  return s;
}
function parseBackup(text){if(text.length>10*1024*1024)throw new Error('Backup is too large (maximum 10 MB).');let x;try{x=JSON.parse(text);}catch{throw new Error('This is not a valid JSON backup.');}return migrate(x);}
class Store{
  constructor(storage){this.storage=storage;this.warning='';this.blocked=false;this.undoStack=[];this.redoStack=[];let raw;try{raw=storage?.getItem(STORAGE_KEY);}catch{this.storage=null;this.warning='Browser storage is unavailable. Changes are temporary; export a backup before closing.';}if(raw){try{this.data=migrate(JSON.parse(raw));}catch{this.data=seed();this.blocked=true;this.warning='Saved data could not be upgraded and has been preserved. Export original saved data in Settings before restoring or resetting.';}}else this.data=seed();}
  write(next){validateState(next);if(this.storage){try{this.storage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('Could not save. Export a backup before clearing browser storage.');}}this.data=next;this.blocked=false;if(this.storage)this.warning='';}
  commit(change,replace=false,summary='Workspace updated'){
    if(this.blocked&&!replace)throw new Error('Reload, restore a backup or reset before saving.');const before=clone(this.data),next=replace?migrate(change):clone(this.data);if(!replace)change(next);const changes=changesBetween(before,next);if(!changes.length&&!replace)return this.data;
    next.auditLog=[...next.auditLog,{id:uid('change'),at:new Date().toISOString(),actor:next.settings.teacher,summary,changes}].slice(-200);this.write(next);this.undoStack.push({before,after:clone(next),summary});if(this.undoStack.length>20)this.undoStack.shift();this.redoStack=[];return next;
  }
  undo(){if(this.blocked)throw new Error('Reload before undoing.');const entry=this.undoStack.at(-1);if(!entry)throw new Error('Nothing to undo in this session.');const next=clone(entry.before);next.settings.nextStudentNumber=Math.max(next.settings.nextStudentNumber,this.data.settings.nextStudentNumber);next.auditLog=[...this.data.auditLog,{id:uid('undo'),at:new Date().toISOString(),actor:this.data.settings.teacher,summary:'Undid: '+entry.summary,changes:changesBetween(this.data,next)}].slice(-200);this.write(next);this.undoStack.pop();this.redoStack.push(entry);return next;}
  redo(){if(this.blocked)throw new Error('Reload before redoing.');const entry=this.redoStack.at(-1);if(!entry)throw new Error('Nothing to redo in this session.');const next=clone(entry.after);next.settings.nextStudentNumber=Math.max(next.settings.nextStudentNumber,this.data.settings.nextStudentNumber);next.auditLog=[...this.data.auditLog,{id:uid('redo'),at:new Date().toISOString(),actor:this.data.settings.teacher,summary:'Redid: '+entry.summary,changes:changesBetween(this.data,next)}].slice(-200);this.write(next);this.redoStack.pop();this.undoStack.push(entry);return next;}
}
return {...B,VERSION,YEAR_LEVELS,HOMEGROUPS,ABSENCE_TYPES,normalizeYear,normalizeHomegroup,validateYearLevel,studentChoices,PALETTE,ASSESSMENT_STATUSES,classArchiveInfo,classArchived,displayName,studentEnrolled,classAvailable,classEnrolled,classRoster,yearRoster,recurringOn,sessionsOn,occurrences,nextTeachingDay,reviseTimetable,archiveStudent,restoreStudent,archiveClass,restoreClass,allocateStudentNumber,addStudents,attendanceValue,setAttendance,attendanceEntries,attendanceSummary,assessmentStatus,assessedValue,overall,assessmentAverage,parseDelimited,studentImport,changesBetween,migrate,seed,validateState,parseBackup,Store};
});
