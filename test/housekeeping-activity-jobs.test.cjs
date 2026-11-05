const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const source = path.join(__dirname, '../app/lib/housekeeping-activity-jobs.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = new Module(source, module); loaded.filename = source; loaded.paths = module.paths; loaded._compile(compiled.outputText, source);
const { groupHousekeepingJobs } = loaded.exports;
const event = (id, action, minute, room = '101', extra = {}) => ({ id, action, createdAt: `2026-10-28T10:${String(minute).padStart(2, '0')}:00Z`, roomCode: room, roomType: 'Standard', attendant: 'Nimal', state: 'Assigned', status: 'Clean', actorName: id, ...extra });

test('one cleaning job retains the separate request, assignment, start and completion actors', () => {
  const events = [event('requester', 'requested', 0), event('assigner', 'assigned', 1), event('starter', 'cleaning_started', 2), event('completer', 'cleaning_completed', 3)];
  const jobs = groupHousekeepingJobs([...events].reverse());
  assert.equal(jobs.length, 1); assert.equal(jobs[0].id, 'requester');
  assert.deepEqual(jobs[0].events.map(item => item.actorName), ['requester', 'assigner', 'starter', 'completer']);
});
test('repeated jobs in one room never borrow actors from the prior cleaning cycle', () => {
  const jobs = groupHousekeepingJobs([event('old-request', 'requested', 0), event('old-assigned', 'assigned', 1), event('old-done', 'cleaning_completed', 2), event('new-request', 'requested', 3), event('new-start', 'cleaning_started', 4)].reverse());
  assert.equal(jobs.length, 2); assert.equal(jobs[0].id, 'new-request');
  assert.deepEqual(jobs[0].events.map(item => item.id), ['new-request', 'new-start']);
  assert.ok(!jobs[0].events.some(item => item.action === 'assigned'));
});
test('claims and reassignments stay in their job; a direct assignment after completion starts another', () => {
  const jobs = groupHousekeepingJobs([event('request', 'requested', 0), event('claim', 'claimed', 1), event('reassign', 'assigned', 2), event('complete', 'cleaning_completed', 3), event('direct', 'assigned', 4)].reverse());
  assert.equal(jobs.length, 2); assert.deepEqual(jobs[1].events.map(item => item.action), ['requested', 'claimed', 'assigned', 'cleaning_completed']);
  assert.deepEqual(jobs[0].events.map(item => item.id), ['direct']);
});
test('checkout dirty marker belongs with the following request; the next dirty marker starts fresh', () => {
  const jobs = groupHousekeepingJobs([event('dirty', 'room_marked_dirty', 0), event('request', 'requested', 1), event('claim', 'claimed', 2), event('done', 'cleaning_completed', 3), event('inspect', 'inspection_completed', 4), event('next-dirty', 'room_marked_dirty', 5)].reverse());
  assert.equal(jobs.length, 2); assert.equal(jobs[1].events.length, 5); assert.equal(jobs[0].id, 'next-dirty');
});
test('physical room IDs prevent matching room numbers from merging; missing early events stay missing', () => {
  const jobs = groupHousekeepingJobs([event('a', 'cleaning_started', 0, '101', {physicalRoomId:'room-a'}), event('b', 'assigned', 1, '101', {physicalRoomId:'room-b'}), event('c', 'cleaning_completed', 2, '101', {physicalRoomId:'room-a'})].reverse());
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs.find(job => job.id === 'a').events.map(item => item.action), ['cleaning_started', 'cleaning_completed']);
});
test('stable card identity survives an update, with deterministic ObjectId ordering for tied timestamps', () => {
  const a = event('000000000000000000000001', 'requested', 0), b = event('000000000000000000000002', 'assigned', 0), c = event('000000000000000000000003', 'cleaning_completed', 1);
  const before = groupHousekeepingJobs([b, a]), after = groupHousekeepingJobs([c, b, a]);
  assert.equal(before[0].id, after[0].id); assert.deepEqual(after[0].events.map(item => item.id), [a.id,b.id,c.id]);
});
