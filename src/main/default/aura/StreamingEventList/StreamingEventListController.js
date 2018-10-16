({
    onInit : function(component, event, helper) {
        // Init UI
        component.find('eventTable').set('v.columns', [
            {label: 'Time', fieldName: 'time', type: 'text', sortable: true, initialWidth: 180},
            {label: 'Channel', fieldName: 'channel', type: 'text', sortable: true, initialWidth: 200},
            {label: 'Replay Id', fieldName: 'replayId', type: 'number', sortable: true, initialWidth: 100},
            {label: 'Payload', fieldName: 'payload', type: 'text'},
            {label: ' ', type: 'button-icon', initialWidth: 50, typeAttributes: { iconName: 'utility:zoomin', name: 'view', title: 'Click to View Details'}},
        ]);
        // Init EMP API
        const empApi = component.find('empApi');
        empApi.isEmpEnabled().then(isEnabled => {
            if (!isEnabled) {
                console.warn('EMP API is not enabled is this environment. Demo will not work.');
            }
        });
        empApi.setDebugFlag(true);
        empApi.onError($A.getCallback(error => {
            console.error('An EMP API error occured: ', error);
            helper.notify(component, 'error', 'An EMP API error occured');
        }));
    },

    onMonitorEvent : function(component, event, helper) {
        const params = event.getParam('params');
        switch (event.getParam('action')) {
            case 'subscribeRequest':
                helper.subscribe(component, params.channel, params.replayId);
            break;
            case 'unsubscribeRequest':
                helper.unsubscribe(component, params);
            break;
        }
    },

    handleEventTableRowAction: function (component, event, helper) {
        const action = event.getParam('action');
        const row = event.getParam('row');
        switch (action.name) {
            case 'view':
                helper.showEventDetails(component, row);
            break;
        }
    },

    clearReceivedEvents : function(component, event, helper) {
        component.set('v.receivedEvents', []);
    }
})
