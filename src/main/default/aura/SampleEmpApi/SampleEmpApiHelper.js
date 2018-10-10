({
    getChannelPrefix : function(eventType) {
        let channelPrefix = '';
        switch (eventType) {
            case 'pushTopicEvent':
                channelPrefix = '/topic/';
            break;
            case 'genericEvent':
                channelPrefix = '/u/';
            break;
            case 'platformEvent':
                channelPrefix = '/event/';
            break;
            case 'cdcEvent':
                channelPrefix = '/data/';
            break;
            default:
                console.warn('Cannot publish: unsupported event type: '+ eventType);
                return null;
            break;
        }
        return channelPrefix;
    },

    notify : function(component, type, message) {
        component.find('notifLib').showToast({
            variant: type,
            title: message
        });
    }
})
