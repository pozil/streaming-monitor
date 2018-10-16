({
    subscribe : function(component, channel, replayId) {
        const empApi = component.find('empApi');
        empApi.subscribe(channel, replayId, $A.getCallback(eventReceived => {
            // Log and notify about event
            console.log('Received event ', JSON.stringify(eventReceived));
            this.notify(component, 'success', 'Received event '+ eventReceived.channel);
            // Save event
            this.saveEvent(component, eventReceived);
        }))
        .then(newSubscription => {
            // Log and notify about subscription
            this.notify(component, 'success', 'Subscribed to channel ' + newSubscription.channel);
            // Save and sort subscriptions
            const subscriptions = component.get('v.subscriptions');
            subscriptions.push(newSubscription);
            subscriptions.sort((a, b) => {
                const channelA = a.channel.toUpperCase();
                const channelB = b.channel.toUpperCase();
                if (channelA < channelB) {
                    return -1;
                }
                if (channelA > channelB) {
                    return 1;
                }
                return 0;
            });
            component.set('v.subscriptions', subscriptions);
        });
    },

    saveEvent : function(component, evt) {
        // Build id for datatable
        let id = '';
        if (typeof evt.data.schema !== 'undefined') { // Generic event does not support schema Id
            id = evt.data.schema;
        } else {
            id = evt.channel;
        }
        id += evt.data.event.replayId;
        // Extract time from event
        let time = null;
        if (typeof evt.data.event.createdDate !== 'undefined') { // Generic event and PushTopic
            time = new Date(evt.data.event.createdDate);
        } else if (typeof evt.data.payload.ChangeEventHeader !== 'undefined') { // CDC
            time = new Date(evt.data.payload.ChangeEventHeader.commitTimestamp);
        } else if (typeof evt.data.payload.CreatedDate !== 'undefined') { // Platform Event
            time = new Date(evt.data.payload.CreatedDate);
        }
        // Assemble payload
        let payload = null;
        if (typeof evt.data.payload !== 'undefined') {
            payload = evt.data.payload;
        } else if (typeof evt.data.sobject !== 'undefined') { // PushTopic
            payload = evt.data.sobject;
        }
        // Build event row
        const eventRow = {
            id,
            time: $A.localizationService.formatDate(time, 'yyyy-MM-dd HH:mm:ss'),
            channel: evt.channel,
            replayId: evt.data.event.replayId,
            payload: JSON.stringify(payload),
        };
        // Append row to table
        const receivedEvents = component.get('v.receivedEvents');
        receivedEvents.unshift(eventRow);
        component.set('v.receivedEvents', receivedEvents);
    },

    updateChannel : function(component, pubSubPrefix) {
        const eventType = component.get('v.'+ pubSubPrefix +'EventType');
        const eventName = component.get('v.'+ pubSubPrefix +'EventName');
        const channelPrefix = this.getChannelPrefix(eventType);
        const channelComp = component.find(pubSubPrefix +'Channel');
        if (eventName === '') {
            channelComp.set('v.value', channelPrefix);
        } else {
            channelComp.set('v.value', channelPrefix + eventName);
        }
    },

    loadEvents : function(component, pubSubPrefix) {
        component.set('v.'+ pubSubPrefix +'EventName', '');
        this.updateChannel(component, pubSubPrefix);
        
        const eventType = component.get('v.'+ pubSubPrefix +'EventType');
        const channelDirectory = component.get('v.channels');
        component.find(pubSubPrefix +'EventName').set('v.options', channelDirectory[eventType]);
    },

    showEventDetails : function(component, eventData) {
        $A.createComponent('c:StreamingEventModal', { eventData }, (content, status, errorMessage) => {
            if (status === 'SUCCESS') {
                const body = content;
                component.find('overlayLib').showCustomModal({
                    header: 'Event details',
                    body,
                    showCloseButton: true
                });
            } else if (status === 'ERROR') {
                console.error('Error: ' + errorMessage);
            }
        });
    },

    getChannelPrefix : function(eventType) {
        switch (eventType) {
            case 'PushTopicEvent':
                return '/topic/';
            case 'GenericEvent':
                return '/u/';
            case 'PlatformEvent':
                return '/event/';
            case 'ChangeDataCaptureEvent':
                return '/data/';
        }
    },

    notify : function(component, type, message) {
        component.find('notifLib').showToast({
            variant: type,
            title: message
        });
    },

    initReplayOptions : function(component, componentId) {
        const combobox = component.find(componentId);
        combobox.set('v.options', [
            {label: 'No replay', value: '-1'},
            {label: 'Replay past events', value: '-2'}
        ]);
        combobox.set('v.value', '-1');
    }
})
