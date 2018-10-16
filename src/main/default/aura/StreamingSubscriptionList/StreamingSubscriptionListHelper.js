({
    saveSubscription : function(component, subscription) {
        // Save and sort subscriptions
        const subscriptions = component.get('v.subscriptions');
        subscriptions.push(subscription);
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
    },

    fireMonitorEvent : function(action, params) {
        const monitorEvent = $A.get('e.c:StreamingMonitorEvent');
        monitorEvent.setParams({ action, params });
        monitorEvent.fire();
    }
})
