({
    onInit : function(component, event, helper) {
        // Init UI
        const eventTypes = [
            {label: 'PushTopic event', value: 'PushTopicEvent'},
            {label: 'Generic event', value: 'GenericEvent'},    
            {label: 'Platform event', value: 'PlatformEvent'},
            {label: 'CDC event', value: 'ChangeDataCaptureEvent'}
        ];
        component.find('subEventType').set('v.options', eventTypes);
        component.find('pubEventType').set('v.options', eventTypes);
        component.find('eventTable').set('v.columns', [
            {label: 'Time', fieldName: 'time', type: 'text', sortable: true, initialWidth: 180},
            {label: 'Channel', fieldName: 'channel', type: 'text', sortable: true, initialWidth: 200},
            {label: 'Replay Id', fieldName: 'replayId', type: 'number', sortable: true, initialWidth: 100},
            {label: 'Payload', fieldName: 'payload', type: 'text'},
            {label: ' ', type: 'button-icon', initialWidth: 50, typeAttributes: { iconName: 'utility:zoomin', name: 'view', title: 'Click to View Details'}},
        ]);
        helper.initReplayOptions(component, 'subAllReplay');
        helper.initReplayOptions(component, 'subReplay');
        
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

        // Load all channel events
        const server = component.find('server');
        server.callServer(component.get('c.getAllEventChannels'), {}, false, $A.getCallback(channels => {
            component.set('v.channels', channels);
        }));
    },

    onSubscribeAllRequest : function(component, event, helper) {
        const empApi = component.find('empApi');
        const channelDirectory = component.get('v.channels');
        const replayId = component.find('subAllReplay').get('v.value');
        
        // Assemble flat list of all streaming event channels
        let prefix = helper.getChannelPrefix('PushTopicEvent');
        let allChannels = channelDirectory.PushTopicEvent.map(channelInfo => (prefix + channelInfo.value));
        prefix = helper.getChannelPrefix('GenericEvent');
        allChannels = allChannels.concat(channelDirectory.GenericEvent.map(channelInfo => (prefix + channelInfo.value)));
        prefix = helper.getChannelPrefix('PlatformEvent');
        allChannels = allChannels.concat(channelDirectory.PlatformEvent.map(channelInfo => (prefix + channelInfo.value)));
        allChannels.push('/data/ChangeEvents');
        
        // Subscribe to all channels
        console.log('Subscribing to all streaming events: ', allChannels);
        allChannels.forEach(channel => {
            helper.subscribe(component, channel, replayId);
        });
    },

    onSubscribeRequest : function(component, event, helper) {
        const channel = component.find('subChannel').get('v.value');
        const replayId = component.find('subReplay').get('v.value');
        helper.subscribe(component, channel, replayId);
        component.set('v.subEventName', '');
    },

    onUnsubscribeRequest : function(component, event, helper) {
        const target = event.getSource();
        const channel = target.get('v.name');
        const empApi = component.find('empApi');
        const subscriptions = component.get('v.subscriptions');
        // Find subscription
        const thisSubscription = subscriptions.filter(sub => sub.channel === channel);
        if (thisSubscription.length !== 1) {
            helper.notify(component, 'error', 'Failed to unsubscribe: unknown subscription to ' + channel);
            return;
        }
        // Unsubscribe
        empApi.unsubscribe(thisSubscription[0], $A.getCallback(unsubscribe => {
            console.log('Unsubscribe callback ', typeof unsubscribe, JSON.stringify(unsubscribe));
            helper.notify(component, 'success', 'Unsuscribed from: ' + unsubscribe.subscription);
        }));
        // Update UI
        const updatedSubscriptions = subscriptions.filter(sub => sub.channel !== channel);
        component.set('v.subscriptions', updatedSubscriptions);
    },

    onPublishRequest : function(component, event, helper) {
        const server = component.find('server');
        const eventType = component.get('v.pubEventType');
        const eventName = component.get('v.pubEventName');
        const eventPayload = component.find('pubEventPayload').get('v.value');

        const serverAction = component.get('c.publish'+ eventType);
        const actionParams = { eventName, eventPayload };
        server.callServer(serverAction, actionParams, false, () => {
            console.log('Published event '+ eventName +' with payload: ', eventPayload);
        });
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

    onChangeSubEventType : function(component, event, helper) {
        helper.loadEvents(component, 'sub');
    },

    onChangeSubEventName : function(component, event, helper) {
        helper.updateChannel(component, 'sub');
    },

    onChangePubEventType : function(component, event, helper) {
        helper.loadEvents(component, 'pub');
    },

    onChangePubEventName : function(component, event, helper) {
        helper.updateChannel(component, 'pub');
    },

    clearReceivedEvents : function(component, event, helper) {
        component.set('v.receivedEvents', []);
    }
})
