({
    onInit : function(component, event, helper) {
        // Init UI
        const eventTypes = [
            {label: 'PushTopic event', value: 'pushTopicEvent'},
            {label: 'Generic event', value: 'genericEvent'},    
            {label: 'Platform event', value: 'platformEvent'},
            {label: 'CDC event', value: 'cdcEvent'}
        ];
        component.find('subEventType').set('v.options', eventTypes);
        component.find('pubEventType').set('v.options', eventTypes);
        component.set('v.eventPayload', '{"Message__c": "test"}');

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

    onSubscribeRequest : function(component, event, helper) {
        const empApi = component.find('empApi');
        const channel = component.get('v.subEventChannel');
        const replayId = -2;
        empApi.subscribe(channel, replayId, $A.getCallback(eventReceived => {
            // Log and notify about event
            console.log('Received event ', JSON.stringify(eventReceived));
            helper.notify(component, 'success', 'Received event '+ eventReceived.channel);
            // Save event
            const receivedEvents = component.get('v.receivedEvents');
            receivedEvents.push(JSON.stringify(eventReceived));
            component.set('v.receivedEvents', receivedEvents);
        }))
        .then(newSubscription => {
            // Log and notify about subscription
            helper.notify(component, 'success', 'Subscribed to channel ' + newSubscription.channel);
            // Save subscription
            const subscriptions = component.get('v.subscriptions');
            subscriptions.push(newSubscription);
            component.set('v.subscriptions', subscriptions);
        });
        // Clear form
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
        empApi.unsubscribe(thisSubscription[0], $A.getCallback(message => {
            console.log('Unsubscribe callback ', typeof unsubscribe, JSON.stringify(unsubscribe));
        })).then(unsubscribe => {
            console.log('Unsubscribe promise', typeof unsubscribe, JSON.stringify(unsubscribe));
            helper.notify(component, 'success', 'Unsuscribed from: ' + unsubscribe.channel);
        });
        // Update UI
        const updatedSubscriptions = subscriptions.filter(sub => sub.channel !== channel);
        component.set('v.subscriptions', updatedSubscriptions);
    },

    onPublishRequest : function(component, event, helper) {
        const server = component.find('server');
        const eventType = component.get('v.pubEventType');
        const eventName = component.get('v.pubEventName');
        const eventPayload = component.get('v.pubEventPayload');

        let serverActionName = null;
        switch (eventType) {
            case 'platformEvent':
                serverActionName = 'publishPlatformEvent';
            break;
            case 'genericEvent':
                serverActionName = 'publishGenericEvent';
            break;
            default:
                console.warn('Cannot publish: unsupported event type: '+ eventType);
                return;
            break;
        }
        const serverAction = component.get('c.'+ serverActionName);
        const actionParams = { eventName, eventPayload };
        server.callServer(serverAction, actionParams, false, () => {
            console.log('Published platform event '+ eventName +' with payload: ', JSON.stringify(message));
        });
    },

    onSubEventChange : function(component, event, helper) {
        const eventType = component.get('v.subEventType');
        const eventName = component.get('v.subEventName');
        let channelPrefix = helper.getChannelPrefix(eventType);
        component.set('v.subEventChannel', channelPrefix + eventName);
    },

    onPubEventChange : function(component, event, helper) {
        const eventType = component.get('v.pubEventType');
        const eventName = component.get('v.pubEventName');
        let channelPrefix = helper.getChannelPrefix(eventType);
        component.set('v.pubEventChannel', channelPrefix + eventName);
    },

    clearReceivedEvents : function(component, event, helper) {
        component.set('v.receivedEvents', []);
    }
})
