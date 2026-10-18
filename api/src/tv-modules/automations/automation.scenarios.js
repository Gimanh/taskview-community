// Companion to automation.js. Same module map, plus rule calls and what each call does.
// A module publishes events and actions. A rule takes an event from one module
// and an action from another. originalEvent is the bus name; match decides
// whether this module event actually happened.

const maps = {
    modules: {
        tasks: {
            title: 'Task module',
            events: [
                {
                    name: 'task.completed',
                    originalEvent: 'task.updated',
                    match: (payload) => payload.changes.complete === true,
                },
                {
                    name: 'task.reopened',
                    originalEvent: 'task.updated',
                    match: (payload) => payload.changes.complete === false,
                },
            ],
            actions: [
                {
                    title: 'set.complete',
                    handler: 'Class.setComplete',
                    emits: (params) => (params.complete === true ? 'task.completed' : 'task.reopened'),
                },
            ],
        },
        kanban: {
            title: 'Kanban module',
            events: [
                {
                    name: 'kanban.created',
                    originalEvent: 'kanban.created',
                    match: () => true,
                },
                {
                    name: 'task.movedToColumn',
                    originalEvent: 'task.updated',
                    match: (payload) => Object.prototype.hasOwnProperty.call(payload.changes, 'statusId'),
                    paramsMatch: (payload, params) => payload.changes.statusId === params.statusId,
                },
            ],
            actions: [
                {
                    title: 'change.status',
                    handler: 'Class.changeTaskStatus',
                    getData: 'DataClass.fetchAvailableStatuses',
                    emits: () => 'task.movedToColumn',
                },
            ],
        },
        tags: {
            title: 'Tags module',
            events: [],
            actions: [
                {
                    title: 'add.tag',
                    handler: 'Class.addTag',
                    getData: 'DataClass.fetchTags',
                    emits: () => null,
                },
            ],
        },
    },
}

const dataSources = {
    'DataClass.fetchAvailableStatuses': () => [
        { id: 1, name: 'Backlog' },
        { id: 5, name: 'Done' },
        { id: 9, name: 'Review' },
    ],
    'DataClass.fetchTags': () => [
        { id: 3, name: 'urgent' },
        { id: 8, name: 'billing' },
    ],
}

const handlers = {
    'Class.changeTaskStatus'(task, params) {
        if (task.statusId === params.statusId) return null
        task.statusId = params.statusId
        return { originalEvent: 'task.updated', changes: { statusId: params.statusId } }
    },
    'Class.setComplete'(task, params) {
        if (task.complete === params.complete) return null
        task.complete = params.complete
        return { originalEvent: 'task.updated', changes: { complete: params.complete } }
    },
    'Class.addTag'(task, params) {
        if (task.tagIds.includes(params.tagId)) return null
        task.tagIds.push(params.tagId)
        return null
    },
}

function moduleOf(name) {
    const module = maps.modules[name]
    if (!module) throw new Error(`Unknown module ${name}`)
    return module
}

function findEvent(moduleName, eventName) {
    const event = moduleOf(moduleName).events.find((item) => item.name === eventName)
    if (!event) throw new Error(`${moduleName} has no event ${eventName}`)
    return event
}

function findAction(moduleName, actionTitle) {
    const action = moduleOf(moduleName).actions.find((item) => item.title === actionTitle)
    if (!action) throw new Error(`${moduleName} has no action ${actionTitle}`)
    return action
}

function optionsFor(action) {
    if (!action.getData) return null
    return dataSources[action.getData]()
}

function createRule({ when, then }) {
    const event = findEvent(when.module, when.event)
    const action = findAction(then.module, then.action)
    const options = optionsFor(action)
    const paramId = then.params?.statusId ?? then.params?.tagId
    if (options && !options.some((option) => option.id === paramId)) {
        throw new Error(`${action.getData}() has no id ${paramId}`)
    }
    return { when, then, event, action }
}

function emittedEventName(rule) {
    return rule.action.emits(rule.then.params ?? {})
}

function findCycle(rules) {
    const edges = rules.map((rule) => {
        const emitted = emittedEventName(rule)
        const next = rules.filter((other) => {
            if (!emitted || other.event.name !== emitted) return false
            if (other.event.name !== 'task.movedToColumn') return true
            if (rule.action.title !== 'change.status') return true
            return rule.then.params.statusId === other.when.params?.statusId
        })
        return next
    })

    const color = rules.map(() => 'white')
    const stack = []

    function visit(index) {
        color[index] = 'gray'
        stack.push(index)
        for (const next of edges[index]) {
            const nextIndex = rules.indexOf(next)
            if (color[nextIndex] === 'gray') return stack.slice(stack.indexOf(nextIndex)).map((i) => rules[i])
            if (color[nextIndex] === 'white') {
                const found = visit(nextIndex)
                if (found) return found
            }
        }
        stack.pop()
        color[index] = 'black'
        return null
    }

    for (let index = 0; index < rules.length; index += 1) {
        if (color[index] === 'white') {
            const found = visit(index)
            if (found) return found
        }
    }
    return null
}

function ruleMatches(rule, busEvent, task) {
    if (rule.event.originalEvent !== busEvent.originalEvent) return false
    const payload = { task, changes: busEvent.changes, ruleParams: rule.when.params }
    if (!rule.event.match(payload)) return false
    if (rule.event.paramsMatch && !rule.event.paramsMatch(payload, rule.when.params ?? {})) return false
    return true
}

function run(busEvent, task, rules) {
    const trace = []
    const queue = [busEvent]
    const visited = new Set()
    let depth = 0

    while (queue.length > 0 && depth < 5) {
        const current = queue.shift()
        depth += 1
        for (const rule of rules) {
            const id = `${rule.when.module}.${rule.when.event}->${rule.then.module}.${rule.then.action}`
            if (visited.has(id) || !ruleMatches(rule, current, task)) continue
            visited.add(id)
            const before = { statusId: task.statusId, complete: task.complete, tagIds: [...task.tagIds] }
            const emitted = handlers[rule.action.handler](task, rule.then.params ?? {})
            trace.push({ rule: id, before, after: { statusId: task.statusId, complete: task.complete, tagIds: [...task.tagIds] } })
            if (emitted) queue.push({ ...emitted, task })
        }
    }

    return { task, trace, stopped: queue.length > 0 }
}

function task(overrides = {}) {
    return { id: 1, complete: false, statusId: 1, tagIds: [], ...overrides }
}

function show(title, result) {
    console.log(`\n${title}`)
    for (const step of result.trace) {
        console.log(`  ${step.rule}`)
        console.log(`    ${JSON.stringify(step.before)} -> ${JSON.stringify(step.after)}`)
    }
    if (result.trace.length === 0) console.log('  no rule ran')
    console.log(`  end ${JSON.stringify(result.task)}`)
}

const doneColumn = dataSources['DataClass.fetchAvailableStatuses']().find((column) => column.name === 'Done')
const urgentTag = dataSources['DataClass.fetchTags']().find((tag) => tag.name === 'urgent')

const completedToDone = createRule({
    when: { module: 'tasks', event: 'task.completed' },
    then: { module: 'kanban', action: 'change.status', params: { statusId: doneColumn.id } },
})

const completedAddsTag = createRule({
    when: { module: 'tasks', event: 'task.completed' },
    then: { module: 'tags', action: 'add.tag', params: { tagId: urgentTag.id } },
})

const doneColumnReopens = createRule({
    when: { module: 'kanban', event: 'task.movedToColumn', params: { statusId: doneColumn.id } },
    then: { module: 'tasks', action: 'set.complete', params: { complete: false } },
})

const reopenedCompletesAgain = createRule({
    when: { module: 'tasks', event: 'task.reopened' },
    then: { module: 'tasks', action: 'set.complete', params: { complete: true } },
})

const completedClearsItself = createRule({
    when: { module: 'tasks', event: 'task.completed' },
    then: { module: 'tasks', action: 'set.complete', params: { complete: false } },
})

const userCompleted = { originalEvent: 'task.updated', changes: { complete: true } }

const justCompleted = () => task({ complete: true })

show(
    '1. task completed => change statusId to Done',
    run(userCompleted, justCompleted(), [completedToDone]),
)

show(
    '2. same event, two rules in order: column, then tag',
    run(userCompleted, justCompleted(), [completedToDone, completedAddsTag]),
)

show(
    '3. completed => Done, and that column => not completed',
    run(userCompleted, justCompleted(), [completedToDone, doneColumnReopens]),
)

show(
    '4. already in Done: change.status is a no-op and emits nothing',
    run(userCompleted, task({ complete: true, statusId: doneColumn.id }), [completedToDone]),
)

show(
    '5. kanban.created does not run task.completed rules',
    run({ originalEvent: 'kanban.created', changes: {} }, task(), [completedToDone, completedAddsTag]),
)

show(
    '6. completed => set not completed. Chain stops on reopened',
    run(userCompleted, task({ complete: true }), [completedClearsItself]),
)

const loop = findCycle([completedToDone, doneColumnReopens, reopenedCompletesAgain])
console.log('\n7. save rejects a loop that completes the task again')
console.log(`  ${loop.map((rule) => `${rule.when.event} -> ${rule.then.action}`).join(' | ')}`)

const allowed = findCycle([completedToDone, doneColumnReopens])
console.log('\n8. completed => Done, and Done => not completed, is not a cycle')
console.log(`  ${allowed ? 'rejected' : 'saved'}`)
