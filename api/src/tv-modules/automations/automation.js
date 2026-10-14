const maps = {
    modules:{
        tasks: {
            title: 'Task module',
            events: [
                {
                    name: 'task.completed',
                    originalEvent: 'task.updated',
                    match: (task)=>task.completed === true
                }
            ],
            actions:[
                
            ]
        },
        kanban:{
            title: 'Kanban module',
            events: [
                'kanban.created', 
                'task.updated'
            ],
            actions:[
                {
                    title:'change.status',
                    handler: 'Class.changeTaskStatus',
                    getData: 'DataClass.fetchAvailableStatuses'
                }
            ]
        },
    }
}
// we want when task is completed => change task statusId