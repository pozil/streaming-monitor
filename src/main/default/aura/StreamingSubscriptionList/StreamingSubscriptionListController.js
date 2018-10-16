({
    onMonitorEvent : function(component, event, helper) {
        const params = event.getParam('params');
        switch (event.getParam('action')) {
            case 'subscribeConfirm':
                helper.saveSubscription(component, params);
            break;
        }
    },

    onUnsubscribe : function(component, event, helper) {
        const target = event.getSource();
        const channel = target.get('v.name');
        const subscriptions = component.get('v.subscriptions');
        // Find subscription
        const thisSubscription = subscriptions.filter(sub => sub.channel === channel);
        if (thisSubscription.length !== 1) {
            helper.notify(component, 'error', 'Failed to unsubscribe: unknown subscription to ' + channel);
            return;
        }
        // Unsubscribe
        helper.fireMonitorEvent('unsubscribeRequest', thisSubscription[0]);
        // Update UI
        const updatedSubscriptions = subscriptions.filter(sub => sub.channel !== channel);
        component.set('v.subscriptions', updatedSubscriptions);
    },
})
