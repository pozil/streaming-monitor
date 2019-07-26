({
    onInit : function(component, event, helper) {
        // Load all channel events
        const server = component.find('server');
        server.callServer(component.get('c.getAllEventChannels'), {}, false, $A.getCallback(channels => {
            component.set('v.channels', channels);
            component.set('v.isLoading', false);
        }));
        // Init UI
        const eventTypes = [
            {label: 'PushTopic event', value: 'PushTopicEvent'},
            {label: 'Generic event', value: 'GenericEvent'},    
            {label: 'Platform event', value: 'PlatformEvent'},
            {label: 'CDC event', value: 'ChangeDataCaptureEvent'}
        ];
        component.find('subEventType').set('v.options', eventTypes);
        component.find('pubEventType').set('v.options', eventTypes);
        component.find('regEventType').set('v.options', eventTypes);
        helper.initReplayOptions(component, 'subAllReplay');
        helper.initReplayOptions(component, 'subReplay');
        component.find('accordion').set('v.activeSectionName', ['subAll']);
    },

    onSubscribeAll : function(component, event, helper) {
        const replayId = component.find('subAllReplay').get('v.value');
        const channels = helper.getAllChannels(component);
        channels.push('/data/ChangeEvents');
        // Subscribe to all channels
        console.log('Subscribing to all streaming events: ', channels);
        channels.forEach(channel => {
            helper.fireMonitorEvent('subscribeRequest', { channel, replayId });
        });
    },

    onSubscribe : function(component, event, helper) {
        const channel = component.find('subChannel').get('v.value');
        const replayId = component.find('subReplay').get('v.value');
        helper.fireMonitorEvent('subscribeRequest', { channel, replayId });
        component.set('v.subEventName', '');
    },

    onPublish : function(component, event, helper) {
        const server = component.find('server');
        const eventType = component.get('v.pubEventType');
        const eventName = component.get('v.pubEventName');
        const eventPayload = component.find('pubEventPayload').get('v.value');

        const serverAction = component.get('c.publish'+ eventType);
        const actionParams = { eventName, eventPayload };
        server.callServer(serverAction, actionParams, false, () => {
            helper.notify(component, 'success', 'Published event '+ eventName);
            console.log('Published event '+ eventName +' with payload: ', eventPayload);
        });
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
    }
})
