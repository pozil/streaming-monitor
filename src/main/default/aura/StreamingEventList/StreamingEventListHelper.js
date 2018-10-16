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
        .then(subscription => {
            // Log and notify about subscription
            this.notify(component, 'success', 'Subscribed to channel ' + subscription.channel);
            this.fireMonitorEvent('subscribeConfirm', subscription);
        });
    },

    unsubscribe : function(component, subscription) {
        const empApi = component.find('empApi');
        empApi.unsubscribe(subscription, $A.getCallback(unsubscribe => {
            this.notify(component, 'success', 'Unsuscribed from: ' + unsubscribe.subscription);
        }));
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

    notify : function(component, type, message) {
        component.find('notifLib').showToast({
            variant: type,
            title: message
        });
    },
    
    fireMonitorEvent : function(action, params) {
        const monitorEvent = $A.get('e.c:StreamingMonitorEvent');
        monitorEvent.setParams({ action, params });
        monitorEvent.fire();
    }
})
